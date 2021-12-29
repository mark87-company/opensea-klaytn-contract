import "./configDotenv";

import { promises as fs } from "fs";
import * as path from "path";

import Caver from "caver-js";

import MASTokenJson from "../build/contracts/MAS.json";
import NFTSalesJson from "../build/contracts/MAS_Sales.json";
import WhiteLists from "../build/contracts/WhiteLists.json";
import MASBank from "../build/contracts/bank.json";
import { createCode } from "./createCode";

(async () => {
  const caver = new Caver(
    new Caver.providers.HttpProvider(
      "https://node-api.klaytnapi.com/v1/klaytn",
      {
        headers: [
          {
            name: "Authorization",
            value: `Basic ${process.env.KAS_AUTH}=`,
          },
          { name: "x-chain-id", value: "8217" },
        ],
        keepAlive: false,
      }
    )
  );

  const cwd = process.cwd();
  const keystore = await fs.readFile(
    path.join(cwd, "credential.json"),
    "utf-8"
  );

  // @ts-ignore
  const keyring = caver.wallet.keyring.decrypt(
    keystore,
    process.env.WALLET_KEY
  );

  // @ts-ignore
  caver.wallet.add(keyring);

  const WhiteListsContract = await new caver.contract(
    // @ts-ignore
    WhiteLists.abi,
    keyring.address
  ).deploy(
    {
      from: keyring.address,
      gas: 8000000,
    },
    WhiteLists.bytecode
  );

  const MasToken = await new caver.contract(
    // @ts-ignore
    MASTokenJson.abi,
    keyring.address
  ).deploy(
    {
      from: keyring.address,
      gas: 8000000,
    },
    MASTokenJson.bytecode,
    "Music Ark Station",
    "MAS",
    WhiteListsContract.options.address
  );

  const MASBankContract = await new caver.contract(
    // @ts-ignore
    MASBank.abi,
    keyring.address
  ).deploy(
    {
      from: keyring.address,
      gas: 8000000,
    },
    NFTSalesJson.bytecode,
    MasToken.options.address,
    WhiteListsContract.options.address
  );

  const NFTSales = await new caver.contract(
    // @ts-ignore
    NFTSalesJson.abi,
    keyring.address
  ).deploy(
    {
      from: keyring.address,
      gas: 8000000,
    },
    NFTSalesJson.bytecode,
    MasToken.options.address,
    MASBankContract.options.address,
    WhiteListsContract.options.address
  );

  const codesDirectory = path.join(__dirname, "../created-codes");
  await fs.mkdir(codesDirectory, { recursive: true });

  fs.writeFile(
    path.join(codesDirectory, "WhiteLists.ts"),
    createCode("WhiteLists", WhiteListsContract)
  );

  fs.writeFile(
    path.join(codesDirectory, "MASBank.ts"),
    createCode("MASBank", MASBankContract)
  );

  fs.writeFile(
    path.join(codesDirectory, "MasToken.ts"),
    createCode("MasToken", MasToken)
  );

  fs.writeFile(
    path.join(codesDirectory, "NFTSales.ts"),
    createCode("NFTSales", NFTSales)
  );

  fs.writeFile(
    path.join(codesDirectory, "index.ts"),
    `
      export { default as MasToken } from './MasToken';
      export { default as MASBank } from './MASBank';
      export { default as WhiteLists } from './WhiteLists';
      export { default as NFTSales } from './NFTSales';
    `
  );
})();
