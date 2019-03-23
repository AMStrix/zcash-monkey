import Configstore from "configstore";

export const SETTINGS = {
  rpcurl: "",
  rpcuser: "",
  rpcpassword: "",
  xpub: ""
  // xprv: "",
};

export type Settings = typeof SETTINGS;
type Hints = {
  hint: string;
  desc: string;
};

export const SETTINGS_UI: Record<keyof Settings, Hints> = {
  rpcurl: {
    hint: "ie: http://localhost:18232",
    desc:
      "The url of the zcashd rpc service, (zcash.conf rpcconnect & rpcport)."
  },
  rpcuser: {
    hint: "zcash.conf rpcuser",
    desc: "The url of the zcashd rpc service."
  },
  rpcpassword: {
    hint: "zcash.conf rpcpassword",
    desc: "The url of the zcashd rpc service."
  },
  xpub: {
    hint: "HD public key (experimental, optional)",
    desc: "Extended bip32 public key."
  }
  // xprv: {
  //   hint: "HD private key (exprimental, optional)",
  //   desc: "Extended bip32 private key."
  // }
};

const conf = new Configstore("zcash-monkey", { settings: { ...SETTINGS } });

export const getSettings = () => conf.get("settings") as Settings;
export const getSettingsPath = () => conf.path;
export const saveSettings = (settings: Settings) =>
  conf.set("settings", settings);
