import stdrpc from "stdrpc";
import axios from "axios"; // stdrpc uses axios
import { getState } from "./store";

axios.defaults.timeout = 10000;

export interface BlockChainInfo {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: string;
  difficulty: number;
  // Much much more, but not necessary
}

export interface ScriptPubKey {
  asm: string;
  hex: string;
  reqSigs: number;
  type: string;
  addresses: string[];
}

export interface VIn {
  sequence: number;
  coinbase?: string;
}

export interface VOut {
  value: number;
  valueZat: number;
  n: number;
  scriptPubKey: ScriptPubKey;
}

export interface Transaction {
  txid: string;
  hex: string;
  version: number;
  locktime: number;
  expiryheight: number;
  blockhash: string;
  blocktime: number;
  confirmations: number;
  time: number;
  vin: VIn[];
  vout: VOut[];
  // unclear what vjoinsplit is
  vjoinsplit: any[];
}

export interface Block {
  hash: string;
  confirmations: number;
  size: number;
  height: number;
  version: number;
  merkleroot: string;
  finalsaplingroot: string;
  time: number;
  nonce: string;
  solution: string;
  bits: string;
  difficulty: number;
  chainwork: string;
  anchor: string;
  // valuePools ?
  previousblockhash?: string;
  nextblockhash?: string;
}

export interface BlockWithTransactionIds extends Block {
  tx: string[];
}

export interface BlockWithTransactions extends Block {
  tx: Transaction[];
}

export interface Receipt {
  txid: string;
  amount: number;
  memo: string;
  change: boolean;
}

export interface DisclosedPayment {
  txid: string;
  jsIndex: number;
  outputIndex: number;
  version: number;
  onetimePrivKey: string;
  joinSplitPubKey: string;
  signatureVerified: boolean;
  paymentAddress: string;
  memo: string;
  value: number;
  commitmentMatch: boolean;
  valid: boolean;
  message?: string;
}

// Actually comes back with a bunch of args, but this is all we need
export interface ValidationResponse {
  isvalid: boolean;
  ismine: boolean;
  iswatchonly: boolean;
  account: string;
}

type OperationStatusResponse = {
  id: string;
  status: string;
  result: { txid: string };
  params: {
    fromaddress: string;
    amounts: Amounts;
  };
  error?: {
    code: number;
    message: string;
  };
}[];

export interface ZGetTotalBalanceResponse {
  transparent: string;
  private: string;
  total: string;
}

type Amounts = { address: string; amount: number; memo?: string }[];

type AddressGrouping = [string, number, string?];

// https://github.com/zcash/zcash/blob/master/doc/payment-api.md
interface ZCashNode {
  getblockchaininfo: () => Promise<BlockChainInfo>;
  getblockcount: () => Promise<number>;
  getblock: {
    (numberOrHash: string | number, verbosity?: 1): Promise<
      BlockWithTransactionIds
    >;
    (numberOrHash: string | number, verbosity: 2): Promise<
      BlockWithTransactions
    >;
    (numberOrHash: string | number, verbosity: 0): Promise<string>;
  };
  gettransaction: (txid: string) => Promise<Transaction>;
  validateaddress: (address: string) => Promise<ValidationResponse>;
  listaddressgroupings: () => Promise<AddressGrouping[][]>;
  importaddress: (
    address: string,
    label: string,
    rescan: boolean
  ) => Promise<{}>;
  z_getbalance: (address: string, minConf?: number) => Promise<number>;
  z_gettotalbalance: () => Promise<ZGetTotalBalanceResponse>;
  z_getnewaddress: (type?: "sprout" | "sapling") => Promise<string>;
  z_listaddresses: () => Promise<string[]>;
  z_listreceivedbyaddress: (
    address: string,
    minConf?: number
  ) => Promise<Receipt[]>;
  z_importviewingkey: (
    key: string,
    rescan?: "yes" | "no" | "whenkeyisnew",
    startHeight?: number
  ) => Promise<void>;
  z_exportviewingkey: (zaddr: string) => Promise<string>;
  z_validatepaymentdisclosure: (
    disclosure: string
  ) => Promise<DisclosedPayment>;
  z_validateaddress: (address: string) => Promise<ValidationResponse>;
  z_sendmany: (fromaddress: string, amounts: Amounts) => Promise<string>;
  z_getoperationstatus: (opids: string[]) => Promise<OperationStatusResponse>;
}

export const getNodeSettings = () => {
  const { rpcurl, rpcuser, rpcpassword } = getState().settings;
  return {
    url: rpcurl,
    username: rpcuser,
    password: rpcpassword
  };
};

export const getNode = () => {
  const { rpcurl } = getState().settings;
  if (!rpcurl) {
    throw new Error("Missing rpcurl setting.");
  }
  return stdrpc(getNodeSettings()) as ZCashNode;
};
