// Считает адрес хранилища и stateInit для пары (пул, NFT). Ключей не использует.
// Запуск: node escrow_init.js АДРЕС_ПУЛА АДРЕС_NFT
import { Address, beginCell, storeStateInit } from '@ton/core';
import { LoanEscrow } from './output/giftloan_v2_LoanEscrow.js';

(async () => {
  const pool = Address.parse(process.argv[2]);
  const nft = Address.parse(process.argv[3]);
  const escrow = await LoanEscrow.fromInit(pool, nft);
  const stateInit = beginCell().store(storeStateInit(escrow.init)).endCell().toBoc().toString('base64');
  console.log(JSON.stringify({
    address: escrow.address.toString({ bounceable: false, urlSafe: true }),
    stateInit
  }));
})().catch(e => {
  console.error(String(e));
  process.exit(1);
});
