import "mocha";
import assert from "assert";
import bitcore from "zcash-bitcore-lib";
import * as util from "./util";

describe("util", () => {
  // Keys and values taken from https://iancoleman.io/bip39/
  describe("deriveTransparentAddress", () => {
    const xpub =
      "xpub6DKCpzYonPtjhfL9Gc6cJRxqtX3pvw3ACLguiZByfS1vic1EqgHPRBu7inUvoNxBT1m6BNuU5uUSSo5X3Zzi5mbrByBBQwhvNmmi8HErHt6";
    const addresses = {
      mainnet: {
        0: "t1MZtRMbCE6uJTbVot6XczUKNvG5iRgcf8d",
        999: "t1aCsQns9UuRZzdXp71gFTpcMomyFfpWE1W"
      },
      testnet: {
        0: "tmDQdkC5bcmQobqhFYpqMr8z8XFAXragbZ6",
        999: "tmS3cjdMYsZw58sjFmjyzKVH7Qm458gbea7"
      }
    };

    it("Should generate the correct address for mainnet m/0/0", () => {
      const addr = util.deriveTransparentAddress(
        xpub,
        0,
        bitcore.Networks.mainnet
      );
      assert.equal(addr, addresses.mainnet[0]);
    });

    it("Should generate the correct address for index m/0/999", () => {
      const addr = util.deriveTransparentAddress(
        xpub,
        999,
        bitcore.Networks.mainnet
      );
      assert.equal(addr, addresses.mainnet[999]);
    });

    it("Should generate the correct address for testnet m/0/0", () => {
      const addr = util.deriveTransparentAddress(
        xpub,
        0,
        bitcore.Networks.testnet
      );
      assert.equal(addr, addresses.testnet[0]);
    });

    it("Should generate the correct address for testnet index m/0/999", () => {
      const addr = util.deriveTransparentAddress(
        xpub,
        999,
        bitcore.Networks.testnet
      );
      assert.equal(addr, addresses.testnet[999]);
    });

    it("Should throw on numbers greater than or equal to 2^31", () => {
      assert.ok(
        util.deriveTransparentAddress(
          xpub,
          Math.pow(2, 31) - 1,
          bitcore.Networks.mainnet
        )
      );
      assert.throws(() => {
        util.deriveTransparentAddress(
          xpub,
          Math.pow(2, 31),
          bitcore.Networks.mainnet
        );
      });
    });

    it("Should throw on numbers less than 0", () => {
      assert.throws(() => {
        util.deriveTransparentAddress(xpub, -1, bitcore.Networks.mainnet);
      });
    });
  });

  describe("derivePrivateKey", () => {
    var xprivkey =
      "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi";
    const expectedWif = "cPy4reTCrYakcFeDZBaVujVUwv54UKNb52hVqEmy8q3yHsRC7Z7T";
    it("Should return the correct private key WIF for m/0/1", () => {
      const wif = util.derivePrivateKey(xprivkey, 1, bitcore.Networks.testnet);
      assert.equal(wif, expectedWif);
    });
  });

  describe("dedupeArray", () => {
    it("Should remove duplicates", () => {
      const numArray = [1, 2, 3, 3];
      assert.deepEqual(util.dedupeArray(numArray), [1, 2, 3]);

      const stringArray = ["two", "one", "two", "three"];
      assert.deepEqual(util.dedupeArray(stringArray), ["two", "one", "three"]);

      const one = { 1: "one" };
      const two = { 2: "two" };
      const three = { 3: "three" };
      const objArray = [one, two, three, one];
      assert.deepEqual(util.dedupeArray(objArray), [one, two, three]);
    });

    it("Should leave non-duplicate arrays unchanged", () => {
      const arr = ["one", "two", "three"];
      assert.deepEqual(util.dedupeArray(arr), arr);
    });

    it("Should deduplicate by reference, not deep equality", () => {
      const testObj = { test: "test" };
      const arr = [testObj, { ...testObj }, testObj];
      assert.equal(util.dedupeArray(arr).length, 2);
    });
  });

  describe("removeItem", () => {
    it("Should remove all instances of an item", () => {
      const numArray = [1, 2, 3, 3];
      assert.deepEqual(util.removeItem(numArray, 2), [1, 3, 3]);

      const stringArray = ["two", "one", "two", "three"];
      assert.deepEqual(util.removeItem(stringArray, "two"), ["one", "three"]);

      const one = { 1: "one" };
      const two = { 2: "two" };
      const three = { 3: "three" };
      const objArray = [one, two, three, one];
      assert.deepEqual(util.removeItem(objArray, three), [one, two, one]);
    });

    it("Should remove by reference, not deep equality", () => {
      const testObj = { test: "test" };
      const arr = [testObj, { ...testObj }, testObj];
      assert.equal(util.removeItem(arr, testObj).length, 1);
    });
  });

  describe("encodeHexMemo & decodeHexMemo", () => {
    const memo = "hello tester!";
    const hex = "68656c6c6f2074657374657221";
    it("encodeHexMemo should encode a memo string as hex", () => {
      const thisHex = util.encodeHexMemo(memo);
      assert.equal(thisHex, hex);
    });

    it("decodeHexMemo should decode a hex memo to a string", () => {
      const thisMemo = util.decodeHexMemo(hex);
      assert.equal(thisMemo, memo);
    });

    it("encodeHexMemo and decodeHexMemo should be compatible", () => {
      assert.equal(util.decodeHexMemo(util.encodeHexMemo(memo)), memo);
      assert.equal(util.encodeHexMemo(util.decodeHexMemo(hex)), hex);
    });
  });

  describe("makeContributionMemo & getContributionIdFromMemo", () => {
    const cid = 123;
    const hex = "436f6e747269627574696f6e20313233206f6e204772616e742e696f";

    it("makeContributionMemo should make an encoded memo in the right format", () => {
      assert.equal(util.makeContributionMemo(cid), hex);
    });

    it("getContributionIdFromMemo should get the contribution ID from a hex memo", () => {
      assert.equal(util.getContributionIdFromMemo(hex), cid);
    });

    it("getContributionIdFromMemo should handle zero-padded hex", () => {
      assert.equal(util.getContributionIdFromMemo(hex.padEnd(512, "0")), cid);
    });

    it("Both methods should be compatible", () => {
      assert.equal(
        util.getContributionIdFromMemo(util.makeContributionMemo(cid)),
        cid
      );
    });
  });

  describe("toBaseUnit", () => {
    it("Should convert 20 ZEC to 2000000000 Zat", () => {
      assert.equal(util.toBaseUnit(20), 2000000000);
    });

    it("Should convert 0.00005 ZEC to 5000 Zat", () => {
      assert.equal(util.toBaseUnit(0.00005), 5000);
    });
  });
});
