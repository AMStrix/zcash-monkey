import { createHmac } from "crypto";
import bitcore from "zcash-bitcore-lib";

const {
  HDPublicKey,
  HDPrivateKey,
  Address,
  encoding: { Base58Check }
} = bitcore;

function sha256(input: string) {
  const hash = createHmac("sha256", input);
  return hash.digest("hex");
}

// allow custom network on toWIF fn
// from: zcash-bitcore-lib/lib/privatekey.js (PrivateKey.prototype.toWIF)
const toWIF = function(pk: any, network: any) {
  var compressed = pk.compressed;

  var buf;
  if (compressed) {
    buf = Buffer.concat([
      new Buffer([network.privatekey]),
      pk.bn.toBuffer({ size: 32 }),
      new Buffer([0x01])
    ]);
  } else {
    buf = Buffer.concat([
      new Buffer([network.privatekey]),
      pk.bn.toBuffer({ size: 32 })
    ]);
  }

  return Base58Check.encode(buf);
};

export function chainToNetwork(chain: string) {
  if (!chain) {
    throw new Error("Cannot get network for falsy chain");
  }
  if (chain.includes("test")) {
    return bitcore.Networks.testnet;
  } else {
    return bitcore.Networks.mainnet;
  }
}

// NOTE: these override the hdkey (xpub/xprv) network
export function deriveTransparentAddress(
  xpub: string,
  index: number,
  network: any
) {
  const root = new HDPublicKey(xpub);
  const child = root.derive(`m/0/${index}`);
  const address = new Address(child.publicKey, network);
  return address.toString();
}

export function derivePrivateKey(xpub: string, index: number, network: any) {
  const root = new HDPrivateKey(xpub);
  const child = root.derive(`m/0/${index}`);
  return toWIF(child.privateKey, network);
}

export function dedupeArray(arr: any[]) {
  return arr.filter((item, index) => arr.indexOf(item) === index);
}

export function removeItem<T>(arr: T[], remove: T) {
  return arr.filter(item => item !== remove);
}

export function encodeHexMemo(memo: string) {
  return new Buffer(memo, "utf8").toString("hex");
}

export function decodeHexMemo(memoHex: string) {
  return (
    new Buffer(memoHex, "hex")
      .toString()
      // Remove null bytes from zero padding
      .replace(/\0.*$/g, "")
  );
}

export function makeContributionMemo(contributionId: number) {
  return encodeHexMemo(`Contribution ${contributionId} on Grant.io`);
}

export function getContributionIdFromMemo(memoHex: string) {
  const matches = decodeHexMemo(memoHex).match(
    /Contribution ([0-9]+) on Grant\.io/
  );
  if (matches && matches[1]) {
    return parseInt(matches[1], 10);
  }
  return false;
}

export function toBaseUnit(unit: number) {
  return Math.floor(100000000 * unit);
}

export function sleep(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export function throttle(fn: Function, wait: number) {
  let isCalled = false;
  let lastArgs = null as null | any[];
  return function(...args: any[]) {
    if (!isCalled) {
      fn(...args);
      isCalled = true;
      setTimeout(function() {
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
        isCalled = false;
      }, wait);
    } else {
      lastArgs = args;
    }
  };
}

export function middleEllipsis(s: string, max: number) {
  if (s.length > max) {
    const half = Math.floor((max - 2) / 2);
    const a = s.slice(0, half);
    const b = s.slice(s.length - half, s.length);
    return a + ".." + b;
  }
  return s;
}

export function stringCols(cols: { s: string; width: number }[]) {
  let out = "";
  for (const c of cols) {
    out += middleEllipsis(c.s, c.width).padEnd(c.width);
    out += "  ";
  }
  return out;
}
