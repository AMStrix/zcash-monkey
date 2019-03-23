import terminalKit from "terminal-kit";

import customSingleColumnMenu from "./third-party/termkit/singleColumnMenu";

import {
  getState,
  stateEvents,
  setNav,
  State,
  setState,
  getLatestOperation,
  setStates
} from "./store";
import {
  getCurrentAddresses,
  getInfo,
  getContributions,
  addContributions,
  initAddressList,
  sendCoins,
  populateAddressList,
  initSettings,
  resetSettings,
  setSettings
} from "./actions";
import { decodeHexMemo, stringCols } from "./util";
import { SETTINGS_UI, Settings } from "./settings";

const term = terminalKit.terminal;

// colors
const c = {
  orange: [255, 170, 0]
} as { [index: string]: [number, number, number] };

// geometry
const g = {
  main: { x: 0, y: 3 }
};

// menu options
const menuOpts = { style: term.defaultColor, selectedStyle: term.inverse };

// initialize
const init = async () => {
  term.fullscreen({ noAlternate: false });
  term.on("key", (k: string) => {
    if (k === "CTRL_C") {
      exit();
    }
  });
  setStates({ initializing: true, status: "initializing..." });
  initSettings();
};

// ******* ROOT ********
stateEvents.on("change", (state: State, prev: State) => {
  renderStatus();

  if (state.error) {
    renderError(state, prev);
    return;
  }

  if (state.initializing) {
    return;
  }

  const render = {
    settings: renderSettings,
    addresses: renderAddresses,
    send: renderSend,
    sendingCoins: renderSendingCoins,
    info: renderInfo,
    contributions: renderContributions,
    addToWallet: renderAddToWallet,
    addedToWallet: renderAddedToWallet,
    TEST: renderTEST
  } as Record<string, Function>;

  if (render[state.nav]) {
    render[state.nav](state, prev);
  } else if (state.nav !== "") {
    term
      .moveTo(3, 3)
      .eraseLine()
      .red(`No renderer found for nav `)
      .white(state.nav);
  } else if (state.nav === "") {
    activateMainMenu();
  }
});

// ***** MENUS *****
let menuActive = null as any | string;
const activateMenu = (name: string, create: () => any) => {
  if (menuActive && menuActive.name === name) {
    menuActive.remove();
  }
  if (menuActive && menuActive.name !== name) {
    throw Error(
      `Menu conflict, tried to load ${name}, but ${
        menuActive.name
      } already loaded`
    );
  }
  menuActive = create();
  menuActive.name = name;
};

const clearMenuActive = () => {
  menuActive = null;
};

const backFn = () => {
  setNav("");
};

const activateOptionMenu = (
  name: string,
  refreshFn: () => void,
  extra?: { [index: string]: () => void }
) => {
  const base = {
    "⬅ back": backFn,
    "⟳ refresh": refreshFn
  };
  const withExtra = { ...base, ...extra } as any;
  rowMenu(name, withExtra);
};

const rowMenu = (name: string, mapping: Record<string, Function>) => {
  const createMenu = () =>
    term.singleRowMenu(
      Object.entries(mapping).map(([k, v]) => k),
      menuOpts,
      async (error, r) => {
        clearMenuActive();
        term.eraseLine();
        if (mapping[r.selectedText]) {
          mapping[r.selectedText]();
        }
      }
    );
  activateMenu(name, createMenu);
};

const colMenu = (name: string, mapping: Record<string, Function>) => {
  const createMenu = () =>
    customSingleColumnMenu.call(
      term,
      Object.entries(mapping).map(([k, v]) => k),
      menuOpts,
      (_: any, r: any) => {
        clearMenuActive();
        if (mapping[r.selectedText]) {
          mapping[r.selectedText]();
        }
      }
    );
  activateMenu(name, createMenu);
};

// const gridMenu = (name: string, mapping: Record<string, Function>) => {
//   if (registerActiveMenu(name)) {
//     return;
//   }
//   term.gridMenu(
//     Object.entries(mapping).map(([k, _]) => k),
//     { ...menuOpts, width: term.width, itemMaxWidth: 10 },
//     async (error, r) => {
//       clearMenuActive();
//       if (mapping[r.selectedText]) {
//         mapping[r.selectedText]();
//       }
//     }
//   );
// };

const activateMainMenu = () => {
  const createMenu = () => {
    const { settings } = getState();
    const menuItems = getState().rootMenu.filter(m => {
      if (m === "contributions" && !settings.xpub) {
        return false;
      }
      return true;
    });
    term.moveTo(10, 2).eraseDisplayBelow();
    return term.singleRowMenu(menuItems, menuOpts, async (_, r) => {
      clearMenuActive();
      term.eraseLine();
      if (r.selectedText === "exit") {
        exit();
      } else {
        setNav(r.selectedText);
        if (r.selectedText === "addresses") {
          initAddressList();
        }
        if (r.selectedText === "info") {
          getInfo();
        }
        if (r.selectedText === "contributions") {
          const { page, perPage } = getState().contributionPage;
          getContributions(page, perPage);
        }
        if (r.selectedText === "send") {
          initAddressList();
        }
      }
    });
  };
  activateMenu("mainMenu", createMenu);
};

// ***** INPUT *****
const getCursorLoc = () =>
  new Promise<{ x: number; y: number }>((res, rej) =>
    term.getCursorLocation((e, x, y) =>
      e ? rej(e) : res({ x, y } as { x: number; y: number })
    )
  );

const inputField = () =>
  new Promise<string>((res, rej) =>
    term.inputField({}, (e, r) => (e ? rej(e) : res(r)))
  );

const gatherInput = async (inputs: Record<string, string>) => {
  let { x, y } = await getCursorLoc();
  const entries = Object.entries(inputs);
  const results = {} as Record<string, string>;
  for (const [k, disp] of entries) {
    term.moveTo(x, ++y);
    term.blue(disp + ": ");
    const res = await inputField();
    results[k] = res;
  }
  return results;
};

// ***** RENDERERS *****
const renderStatus = () => {
  const { status, nav } = getState();
  term
    .moveTo(1, 1)
    .colorRgb.apply(term, c.orange)("ⓩ ")
    .styleReset()
    .eraseLineAfter();
  if (nav) {
    term.dim()(` | ${nav}`);
  }
  if (status) {
    term
      .dim()(` | `)
      .blue(status);
  }
  term.styleReset();
};

const renderSettings = async (state: State, prev: State) => {
  const x = g.main.x;
  let y = g.main.y;
  term.moveTo(x, y).eraseDisplayBelow();
  const { editSettings, settings, networkError } = state;
  if (!settings.rpcurl || networkError || editSettings) {
    if (networkError) {
      term("There was a network problem with the settings:");
      term.moveTo(x, ++y).red(networkError);
      term.moveTo(x, ++y);
    }
    term
      .moveTo(x, ++y)(`${!settings.rpcurl ? "Add" : "Edit"} settings`)
      .styleReset();
    term.moveTo(x, ++y);
    const inputMapping = Object.entries(SETTINGS_UI).reduce(
      (acc: Record<string, string>, [k, v]) => {
        const sk = k as keyof Settings;
        acc[k] = `${k} (${settings[sk] ? settings[sk] : v.hint})`;
        return acc;
      },
      {}
    );
    let res = (await gatherInput(inputMapping)) as Settings;
    y = (await getCursorLoc()).y;
    term.moveTo(x, ++y);
    rowMenu("initSettingsMenu", {
      reset: resetSettings,
      "use these settings": () => setSettings(res)
    });
  } else {
    term.blue("Settings");
    term.moveTo(x, (y += 2));
    const pl = (l: string, v: any) => {
      term.moveTo(x, y).eraseLineAfter()(l);
      term.moveTo(x + 15, y++).eraseLineAfter();
      if (v) {
        term.bold(v);
      } else {
        term.dim("n/a");
      }
    };
    for (const [k, v] of Object.entries(settings)) {
      pl(k, v);
    }
    term.moveTo(x, y);
    rowMenu("settingsMenu", {
      "⬅ back": backFn,
      edit: () => setStates({ editSettings: true })
    });
  }
};

const renderInfo = (state: State, prev: State) => {
  const x = g.main.x;
  let y = g.main.y;
  const { info, infoLoaded, infoLoading } = state;
  if (infoLoaded) {
    const pl = (l: string, v: any) => {
      term.moveTo(x, y).eraseLineAfter()(l);
      term
        .moveTo(x + 10, y++)
        .eraseLineAfter()
        .bold(v);
    };
    const { rpcurl, rpcuser } = state.settings;
    pl("chain", info.chain);
    pl("blocks", info.blocks);
    pl("url", `${rpcuser ? rpcuser + ":●●●@" : ""}${rpcurl}`);
    pl("settings", state.settingsPath);
  }
  if (infoLoading) {
    term
      .moveTo(x, y++)
      .eraseLine()
      .cyan("loading...");
  } else {
    if (prev.infoLoading) {
      term.moveTo(x, y++);
      activateOptionMenu("infoMenu", getInfo);
    } else {
      term.moveTo(x, y++).eraseDisplayBelow();
    }
  }
};

const renderAddresses = (state: State, prev: State) => {
  const x = g.main.x;
  let y = g.main.y;
  const {
    addresses,
    addressesLoaded,
    addressesLoading,
    totalBalances
  } = getState();
  term.moveTo(x, y);
  term("total: ")
    .bold(totalBalances.total)
    .dim(" | ");
  term("transparent: ")
    .bold(totalBalances.transparent)
    .dim(" | ");
  term("private: ").bold(totalBalances.private);
  term.moveTo(x, (y += 2));
  const addressEntries = Object.entries(addresses)
    .map(([_, v]) => v)
    .sort((a, b) => (a.account > b.account ? -1 : 1))
    .sort((a, b) => (a.balance > b.balance ? -1 : 1));
  if (addressEntries.length === 0) {
    term
      .moveTo(x, y++, 0)
      .eraseLineAfter()
      .dim(`No addresses ${!addressesLoaded ? "yet..." : "found."}`)
      .styleReset();
  }
  addressEntries.forEach(v => {
    const render = stringCols([
      { s: v.address, width: 45 },
      { s: v.account, width: 10 },
      { s: "ⓩ " + v.balance, width: 15 }
    ]);
    term
      .moveTo(x, y)(render)
      .moveTo(x, ++y);
  });
  if (addressesLoading) {
    term
      .moveTo(x, y++)
      .eraseLine()
      .cyan("loading...");
  } else {
    if (prev.addressesLoading) {
      term.moveTo(x, y++);
      activateOptionMenu("adressesMenu", getCurrentAddresses);
    } else {
      term.moveTo(x, y++).eraseDisplayBelow();
    }
  }
};

const renderContributions = (state: State, prev: State) => {
  const x = g.main.x;
  let y = g.main.y;
  const {
    contributionPage: { items, page },
    contributionsLoaded,
    contributionsLoading
  } = getState();
  if (items.length === 0) {
    term
      .moveTo(x, y++, 0)
      .eraseLineAfter()
      .dim(`No contributions ${!contributionsLoaded ? "yet..." : "found."}`)
      .styleReset();
  }
  items.forEach(cont => {
    term.moveTo(x, y);
    let symb = "●";
    if (cont.inWallet) term.colorRgb.apply(term, c.orange);
    if (cont.inWallet && !cont.isMine) symb = "○";
    term(`${symb} `).defaultColor();
    term(`${cont.address}  ${cont.path}`);
    term.moveTo(x + 55, y++)("ⓩ " + cont.balance);
  });
  if (contributionsLoading) {
    term
      .moveTo(x, y++)
      .eraseLine()
      .cyan("loading...");
  } else {
    if (prev.contributionsLoading) {
      term.moveTo(x, y++);
      const { page, perPage } = state.contributionPage;
      activateOptionMenu(
        "contributionsMenu",
        () => getContributions(page, perPage),
        {
          "«page": () => getContributions(page > 0 ? page - 1 : page, perPage),
          "page»": () => getContributions(page + 1, perPage),
          "＋add to node": () => setNav("addToWallet")
        }
      );
    } else {
      term.moveTo(x, y++).eraseDisplayBelow();
    }
  }
};

const renderAddToWallet = (state: State, prev: State) => {
  let y = g.main.y;
  const x = g.main.x;
  term.moveTo(0, y).eraseDisplayBelow();

  if (state.contributionsAdding) {
    term.moveTo(x, y++).blue("Please wait, rescanning the new addresses.");
    term
      .moveTo(x, y++)
      .blue("This will take several minutes.")
      .defaultColor();
    return;
  }
  if (prev.contributionsAdding && !state.contributionsAdding) {
    term.moveTo(x, y++)("Contributions added and scanned.");
    y++;
    rowMenu("contAddSuccessMenu", {
      ok: () => {
        setNav("contributions");
      }
    });
    return;
  }

  const toAdd = Object.entries(getState().contributions).filter(
    ([k, v]) => !v.inWallet
  );

  if (toAdd.length === 0) {
    term.moveTo(x, y++).blue("No contributions to add.\n\n");
    term("On contributions view select ").bold("page»");
    term(" until untracked contributions\n");
    term("appear (denoted with white ●) and then select").bold(
      " ＋add to node"
    )(".\n");
    rowMenu("noContToAddMenu", {
      ok: backFn
    });
    return;
  }
  term.moveTo(x, y++).blue("Add untracked contribution addresses to wallet?");
  term
    .moveTo(x, (y += 1))
    .defaultColor()
    .bold(toAdd.length)
    .styleReset()(" new addresses will be imported and scanned.");
  term
    .moveTo(x, (y += 2))
    .colorRgb.apply(term, c.orange)(
      "This will trigger a rescan taking minutes, and "
    )
    .bold("lock up all RPC communication on the node")(" until complete.")
    .moveTo(x, (y += 1))
    .defaultColor();
  rowMenu("addContConfirmMenu", {
    "no, thanks": backFn,
    "ok, add them": addContributions
  });
};

const renderAddedToWallet = (state: State, prev: State) => {
  let y = g.main.y;
  const x = g.main.x;
  term.moveTo(0, y).eraseDisplayBelow();
  term.moveTo(x, y++)("Contributions added and scanned!");
  y++;
  rowMenu("contAddedSuccessMenu", {
    ok: backFn
  });
};

const renderSend = async (state: State, prev: State) => {
  let y = g.main.y;
  const x = g.main.x;
  term.moveTo(x, y).eraseDisplayBelow();
  if (state.addressPageLoading || state.addressesLoading) {
    term.dim("loading addresses...").styleReset();
    return;
  }
  if (state.addressesLoaded && !state.sendFrom) {
    const addys = state.addressPage.items;
    // no items
    if (addys.length === 0) {
      term.dim("No addresses found.");
      term.moveTo(x, ++y);
      rowMenu("sendNoAddressesMenu", { ok: backFn });
      return;
    }
    // render list
    term.blue("Select an address to send from: \n");
    const mapping: Record<string, Function> = {};
    addys.forEach(a => {
      const disp = stringCols([
        { s: a.address, width: 45 },
        { s: a.account, width: 10 },
        { s: "ⓩ " + a.balance, width: 15 }
      ]);
      mapping[disp] = () => {
        setState("sendFrom", a);
      };
    });
    const { page, perPage } = state.addressPage;
    if (page * perPage + perPage < Object.entries(state.addresses).length) {
      mapping["⬇ more"] = () => {
        populateAddressList(page + 1, perPage);
      };
    }
    mapping["⬅ cancel"] = () => {
      backFn();
    };
    colMenu("sendAddressesMenu", mapping);
  }
  if (!prev.sendFrom && state.sendFrom) {
    term("Sending from ")
      .bold(state.sendFrom.address)
      .dim(`  ${state.sendFrom.account}   `)(`ⓩ ${state.sendFrom.balance}`)
      .moveTo(x, ++y);
    let res = await gatherInput({
      to: "Enter to address",
      amount: "Enter amount",
      memo: "Enter memo (optional, z-addr only)"
    });
    res["from"] = state.sendFrom.address;
    y = (await getCursorLoc()).y + 1;
    term.moveTo(x, y);
    rowMenu("sendConfirmMenu", {
      cancel: () => setState("sendFrom", null),
      "looks good, send it": () => {
        sendCoins(res.from, res.to, parseFloat(res.amount), res.memo);
        setStates({ nav: "sendingCoins", sendFrom: null }); // clear out sendFrom (important)
      }
    });
  }
};

const renderSendingCoins = async (state: State, prev: State) => {
  let y = g.main.y;
  const x = g.main.x;
  term.moveTo(x, y).eraseDisplayBelow();
  term.blue("Send results\n\n");
  y += 2;
  const latestOp = getLatestOperation();
  if (!latestOp) {
    term.dim("No operations found.");
  } else {
    const pl = (l: string, v: any) =>
      term(l + " ")
        .bold(v)
        .moveTo(x, ++y);
    pl("id      ", latestOp.id);
    pl("status  ", latestOp.status);
    if (latestOp.error) {
      pl("error   ", latestOp.error);
    }
    pl("amount  ", latestOp.amount);
    pl("from    ", latestOp.from);
    pl("to      ", latestOp.to);
    pl("checked ", new Date(latestOp.checked).toISOString());
    if (latestOp.memo) {
      pl("memo   ", decodeHexMemo(latestOp.memo));
    }
  }
  term.moveTo(x, ++y);
  if (prev.isWatchOperation && !state.isWatchOperation) {
    term(`Operation completed with `).bold(latestOp && latestOp.status)(
      " status."
    );
    rowMenu("sendingCoinsCompleteMenu", { ok: backFn });
  } else {
    term.dim("awaiting operation results...");
  }
};

const renderTEST = async (state: State, prev: State) => {
  let y = g.main.y;
  const x = g.main.x;
  term.moveTo(x, y).eraseDisplayBelow();
  term.blue("TEST\n\n");
};

const renderError = (state: State, prev: State) => {
  const x = g.main.x;
  let y = g.main.y;
  const { error } = getState();
  term
    .moveTo(x, y)
    .eraseDisplayBelow()
    .moveTo(x, y++)
    .red("⚠️  Error\n")
    .defaultColor(error + "\n");

  if (!prev.error && state.error) {
    rowMenu("errorMenu", {
      ok: () => {
        setStates({ error: "", nav: "" }, false);
      }
    });
  }
};

const renderLog = () => {
  const x = g.main.x;
  let y = term.height - 20;
  term.blue("log:\n");
  for (const l of getState().log.slice(-20)) {
    term(l + "\n");
  }
};

// call init
init();

// exit
const exit = () => {
  term.moveTo(0, 1);
  term.fullscreen(false);
  term.processExit(0);
};
