import { EventEmitter } from "events";
import { throttle } from "./util";
import { getSettings, getSettingsPath } from "./settings";

export const ADDRESS = {
  address: "",
  balance: 0,
  account: "",
  inWallet: false,
  isMine: false
};

export type Address = typeof ADDRESS;
export type KAddress = Partial<Address> & { address: Address["address"] };

interface AddressMap {
  [index: string]: Address;
}

export const CONTRIBUTION = {
  address: "",
  balance: 0,
  path: "",
  inWallet: false,
  isMine: false
};

export type Contribution = typeof CONTRIBUTION;

interface ContributionMap {
  [index: string]: Contribution;
}

export const OPERATION = {
  id: "",
  from: "",
  to: "",
  amount: 0,
  memo: "",
  created: 0,
  checked: 0,
  status: "",
  txid: "",
  confirmations: 0,
  error: ""
};

export type Operation = typeof OPERATION;
export type KOperation = Partial<Operation> & { id: Operation["id"] };

interface OperationMap {
  [index: string]: Operation;
}

// ux state
const state = {
  initializing: false,
  status: "",
  error: "",
  rootMenu: ["info", "addresses", "send", "contributions", "settings", "exit"],
  nav: "",

  settings: getSettings(),
  settingsPath: getSettingsPath(),
  editSettings: false,
  networkError: "",

  info: {
    chain: "",
    blocks: 0
  },
  infoLoaded: false,
  infoLoading: false,

  totalBalances: {
    private: "0",
    transparent: "0",
    total: "0"
  },

  addresses: {} as AddressMap,
  addressesLoaded: false,
  addressesLoading: false,
  addressPage: {
    items: [] as Address[],
    page: 0,
    perPage: 20
  },
  addressPageLoading: false,

  sendFrom: null as null | Address,
  sendingCoins: false,

  contributions: {} as ContributionMap,
  contributionsLoaded: false,
  contributionsLoading: false,
  contributionsAdding: false,
  contributionPage: {
    items: [] as Contribution[],
    page: 0,
    perPage: 20
  },

  operations: {} as OperationMap,
  operationsLoaded: false,
  operationsLoading: false,
  operationPage: {
    items: [] as Operation[],
    page: 0,
    perPage: 20
  },
  isWatchOperation: false,

  log: [] as string[]
};
export type State = typeof state;

const cloneState = () => JSON.parse(JSON.stringify(state));

// ux state events
export const stateEvents = new EventEmitter();

const emitChangeRaw = (state: State, prev: State) => {
  stateEvents.emit("change", state, prev);
};

const emitChangeThrottled = throttle(emitChangeRaw, 500);

const emitChange = (throttle: boolean) => {
  if (throttle) {
    return emitChangeThrottled;
  } else {
    return emitChangeRaw;
  }
};

export function setStates(
  states: Partial<State>,
  throttle = false,
  silent = false
) {
  const prev = cloneState();
  for (const [k, v] of Object.entries(states)) {
    (state as any)[k] = v;
  }
  if (!silent) {
    emitChange(throttle)(state, prev);
  }
}

export function setState(
  key: keyof State,
  val: any,
  throttle: boolean = false
) {
  const prev = cloneState();
  (state as any)[key] = val;
  emitChange(throttle)(state, prev);
}

export function updateStatus(status: string) {
  setState("status", status);
}

export function updateInfo(info: State["info"]) {
  setState("info", info);
}

export function setNav(path: string) {
  setState("nav", path);
}

function update<T>(
  key: string,
  item: Partial<T>,
  defaultItem: T,
  mapping: Record<string, T>,
  throttle: boolean
) {
  const prev = cloneState();
  const existing = mapping[key] || defaultItem;
  mapping[key] = { ...existing, ...item };
  emitChange(throttle)(state, prev);
}

export function updateAddress(addy: KAddress, throttle: boolean = false) {
  update<Address>(addy.address, addy, ADDRESS, state.addresses, throttle);
}

export function updateContribution(
  cont: Partial<Contribution> & { address: Contribution["address"] },
  throttle: boolean = false
) {
  update<Contribution>(
    cont.address,
    cont,
    CONTRIBUTION,
    state.contributions,
    throttle
  );
}

export function updateOperation(op: KOperation, throttle: boolean = false) {
  update<Operation>(op.id, op, OPERATION, state.operations, throttle);
}

export function updateContributionPage(
  p: Partial<State["contributionPage"]>,
  throttle: boolean = false
) {
  const prev = cloneState();
  const existing = state.contributionPage;
  state.contributionPage = { ...existing, ...p };
  emitChange(throttle)(state, prev);
}

export function updateAddressPage(
  p: Partial<State["addressPage"]>,
  throttle: boolean = false
) {
  const prev = cloneState();
  const existing = state.addressPage;
  state.addressPage = { ...existing, ...p };
  emitChange(throttle)(state, prev);
}

export function getState() {
  return state;
}

export function getLatestOperation() {
  const entries = Object.entries(state.operations).map(([k, v]) => v);
  if (entries.length) {
    return entries.sort((a, b) => (a.created > b.created ? -1 : 1))[0];
  }
  return null;
}

export function addLog(s: string) {
  state.log.push(`${state.log.length}) ${s}`);
}
