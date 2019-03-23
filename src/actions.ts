import bitcore from "zcash-bitcore-lib";
import { getNode, getNodeSettings } from "./node";
import {
  // derivePrivateKey,
  chainToNetwork,
  sleep,
  deriveTransparentAddress,
  encodeHexMemo
} from "./util";
import {
  updateAddress,
  updateStatus,
  updateInfo,
  setState,
  updateContribution,
  getState,
  updateContributionPage,
  Contribution,
  CONTRIBUTION,
  Address,
  updateAddressPage,
  updateOperation,
  setStates,
  KOperation,
  KAddress,
  setNav
} from "./store";
import { SETTINGS, Settings, saveSettings } from "./settings";

function extErr(error: any) {
  return error.response
    ? error.response.data
      ? error.response.data.error.message
      : error.toString()
    : error.toString();
}

async function initAndCheckNetwork() {
  const node = getNode();
  const info = await node.getblockchaininfo();
  if (info.chain === "regtest") {
    bitcore.Networks.enableRegtest();
  }
  return info;
}

export async function resetSettings(silent = false) {
  setStates(
    {
      settings: { ...SETTINGS },
      nav: "settings" // force nav to settings
    },
    false,
    silent
  );
}

export async function setSettings(settings: Settings) {
  setStates({ settings: settings }, false, true);
  try {
    const info = await initAndCheckNetwork();
    setStates({ info, nav: "", editSettings: false });
    // settings were good
    saveSettings(settings); // persisted
  } catch (e) {
    resetSettings(true);
    setStates({ networkError: extErr(e) });
  }
}

export async function initSettings() {
  const state = getState();
  try {
    setStates({ status: "checking... " + state.settings.rpcurl });
    const info = await initAndCheckNetwork();
    setStates({ status: "welcome", nav: "", info, initializing: false });
  } catch (e) {
    setStates({
      status: "",
      nav: "settings",
      networkError: extErr(e),
      initializing: false
    });
  }
}

export async function getInfo() {
  const node = getNode();
  const { url } = getNodeSettings();
  updateStatus(
    getState().infoLoaded ? "loading info..." : `connecting to ${url}...`
  );
  setState("infoLoading", true);
  try {
    const info = await initAndCheckNetwork();
    updateInfo(info);
    setState("infoLoaded", true);
  } catch (error) {
    setState("error", extErr(error));
  }
  setState("infoLoading", false);
  updateStatus("");
}

async function getUpdatedAddress(addy: KAddress) {
  const node = getNode();
  const info = await node.validateaddress(addy.address);
  const updated = {
    ...addy,
    inWallet: info.ismine || info.iswatchonly,
    isMine: info.ismine
  };
  return updated;
}

export async function getCurrentAddresses() {
  const node = getNode();
  setState("addressesLoading", true);
  const totals = await node.z_gettotalbalance();
  setStates({ totalBalances: totals });

  updateStatus("loading T addresses...");
  // get addresses with balances
  const groupings = await node.listaddressgroupings();
  const addresses: KAddress[] = [];
  groupings.forEach(g =>
    g.forEach(gg => {
      addresses.push({
        address: gg[0],
        balance: gg[1],
        account: gg.length > 2 ? gg[2] : ""
      });
    })
  );
  // get addresss wallet ownership
  const addressesDeets: KAddress[] = [];
  for (const addy of addresses) {
    addressesDeets.push(await getUpdatedAddress(addy));
  }
  for (const addy of addressesDeets.filter(a => a.isMine)) {
    updateAddress(addy);
  }

  updateStatus("loading Z addresses");
  const list = await node.z_listaddresses();
  for (const a of list) {
    updateStatus("get balance for z-addr");
    const bal = await node.z_getbalance(a);
    updateAddress({ address: a, balance: bal, account: "" });
  }

  setState("addressesLoading", false);
  setState("addressesLoaded", true);
  updateStatus("");
}

async function getUpdatedContribution(cont: Contribution) {
  const node = getNode();
  const info = await node.validateaddress(cont.address);
  let bal = 0;
  if (info.ismine || info.iswatchonly) {
    bal = await node.z_getbalance(cont.address);
  }
  const updated = {
    ...cont,
    balance: bal,
    inWallet: info.ismine || info.iswatchonly,
    isMine: info.ismine
  };
  return updated;
}

export async function getContributions(page: number, perPage: number) {
  const { settings } = getState();
  if (!settings.xpub) {
    setStates({ error: "Must have xpub set to add contributions." });
  }
  updateStatus("loading contributions...");
  setState("contributionsLoading", true);
  const network = chainToNetwork(getState().info.chain);

  const items = [] as Contribution[];
  updateContributionPage({ items, page, perPage });
  const start = page * perPage;
  // first pass
  for (let i = start; i < start + perPage; i++) {
    // update map
    const taddr = deriveTransparentAddress(settings.xpub, i, network);
    const cont = { address: taddr, path: `m/0/${i}` };
    updateContribution(cont);
    // collect page
    items.push({ ...CONTRIBUTION, ...cont });
  }
  updateContributionPage({ items });

  for (let i = 0; i < items.length; i++) {
    const cont = items[i];
    const updated = await getUpdatedContribution(cont);
    items[i] = updated;
    updateContribution(updated);
    updateContributionPage({ items });
  }

  await sleep(100);
  setState("contributionsLoading", false);
  setState("contributionsLoaded", true);
  updateStatus("");
}

export async function addContributions() {
  const node = getNode();
  setState("contributionsAdding", true); // first, important

  const toAdd = Object.entries(getState().contributions)
    .map(([k, v]) => v)
    .filter(c => !c.inWallet);

  // 1. add addresses to wallet without rescanning
  if (toAdd.length) {
    for (const c of toAdd.splice(0, toAdd.length - 1)) {
      try {
        updateStatus(`add ${c.path} ${c.address}...`);
        await node.importaddress(c.address, c.path, false);
      } catch (error) {
        updateStatus(extErr(error));
        await sleep(2000);
      }
    }

    // 2. trigger rescan using last address
    updateStatus("rescanning...");
    // just hit the very last one with rescan=true
    // its important that it not be previously imported
    // otherwise the rescan will not happen
    const last = toAdd[toAdd.length - 1];
    await node.importaddress(last.address, last.path, true);

    // 3. now update balances and ownership info
    updateStatus("updating address info...");
    for (const c of toAdd) {
      const updated = await getUpdatedContribution(c);
      updateContribution(updated, true);
    }
  }

  setStates({
    contributionsAdding: false,
    nav: "addedToWallet",
    status: ""
  });
}

export async function initAddressList() {
  setState("addressPageLoading", true);
  await getCurrentAddresses(); // update or load addresses
  populateAddressList(0, 20);
}

export async function populateAddressList(page: number, perPage: number) {
  setState("addressPageLoading", true);
  const all = Object.entries(getState().addresses)
    .map(([_, a]) => a)
    .sort((a, b) => (a.balance > b.balance ? -1 : 1));
  const items: Address[] = [];
  const start = page * perPage;
  for (let i = start; i < start + perPage && i < all.length; i++) {
    items.push(all[i]);
  }
  updateAddressPage({ items, page, perPage });
  setState("addressPageLoading", false);
}

async function getOperationUpdate(opid: string) {
  const node = getNode();
  const opArray = await node.z_getoperationstatus([opid]);
  if (opArray && !opArray.length) {
    throw new Error(
      "Enexpected return from z_getoperationsstatus, got: " + opArray
    );
  }
  const op = opArray[0];
  return {
    id: opid,
    status: op.status,
    txid: op.result ? op.result.txid : undefined,
    from: op.params.fromaddress,
    amount: op.params.amounts[0].amount,
    to: op.params.amounts[0].address,
    memo: op.params.amounts[0].memo,
    checked: Date.now(),
    error: op.error ? op.error.message : ""
  } as KOperation;
}

export async function sendCoins(
  from: string,
  to: string,
  amount: number,
  memo: string
) {
  const node = getNode();
  setStates({ sendingCoins: true, status: "Sending coins..." });
  try {
    const opid = await node.z_sendmany(from, [
      {
        address: to,
        amount,
        memo: (memo && encodeHexMemo(memo)) || undefined
      }
    ]);
    updateOperation({ id: opid, created: Date.now() });
    const full = await getOperationUpdate(opid);
    updateOperation(full);
    watchOperation(opid);
  } catch (err) {
    setState("error", extErr(err));
  }
  setStates({ sendingCoins: false, status: "" });
}

let watchOperationTimeout = null as null | NodeJS.Timeout;
function watchOperation(opid: string) {
  if (!watchOperationTimeout) {
    setState("isWatchOperation", true);
    watchOperationTimeout = setInterval(async () => {
      const update = await getOperationUpdate(opid);
      updateOperation(update);
      if (update.status != "executing" && watchOperationTimeout) {
        clearInterval(watchOperationTimeout);
        watchOperationTimeout = null;
        setState("isWatchOperation", false);
        // NOTE - watchTransaction?
      }
    }, 2000);
  }
}
