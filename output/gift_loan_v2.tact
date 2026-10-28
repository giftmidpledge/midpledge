// GiftLoan v2 — пул + отдельное хранилище (LoanEscrow) на КАЖДЫЙ залоговый NFT.
// Пул (GiftLoanPool) держит GRAM, проверяет подпись оракула и выдаёт займы.
// Хранилище (LoanEscrow) — свой адрес на каждый NFT: хранит подарок и условия займа.
// Деплой пула: owner, treasury (проценты), signerKey (публичный ключ оракула, uint256), maxLoan (лимит одного займа).
// Пополнение пула — обычный перевод GRAM на адрес пула (без комментария).

message(0x05138d91) OwnershipAssigned {
    queryId: Int as uint64;
    prevOwner: Address;
    forwardPayload: Slice as remaining;
}

message(0x5fcc3d14) NftTransfer {
    queryId: Int as uint64;
    newOwner: Address;
    responseDestination: Address?;
    customPayload: Cell?;
    forwardAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

message(0xB0123410) DeployEscrow { nft: Address; }

message(0xB0123411) LoanRequest {
    nft: Address;
    borrower: Address;
    principal: Int as coins;
    term: Int as uint16;
    exp: Int as uint32;
    sig: Cell;
}

message(0xB0123412) LoanApproved {
    repay: Int as coins;
    principal: Int as coins;
    dueAt: Int as uint32;
    owner: Address;
    treasury: Address;
}

message(0xB0123413) LoanRejected {}
message(0xB0123414) RescueNft { nft: Address; to: Address; }
message(0xB0123415) Rescue { to: Address; }
message(0xB0123416) RescueAnyNft { nft: Address; to: Address; }                          // owner -> пул: вернуть любой NFT, лежащий на адресе пула
message(0xB0123417) RescueForeignNft { escrowNft: Address; foreign: Address; to: Address; } // owner -> пул: вернуть чужой NFT из хранилища подарка escrowNft
message(0xB0123418) RescueForeign { nft: Address; to: Address; }                         // пул -> хранилище

message(0xB0123402) Repay {}
message(0xB0123403) Liquidate {}
message(0xB0123404) Withdraw { amount: Int as coins; }
message(0xB0123405) SetMaxLoan { value: Int as coins; }

const MIN_RESERVE: Int = ton("0.5");      // минимум, который остаётся на пуле
const GAS: Int = ton("0.15");             // газ на возврат NFT при погашении
const DEPLOY_MIN: Int = ton("0.15");      // минимум для создания хранилища
const ESCROW_FUND: Int = ton("0.08");     // стартовый баланс хранилища
const ESCROW_KEEP: Int = ton("0.02");     // сколько хранилище оставляет у себя
const REPAY_GRACE: Int = 86400;           // запас после срока в секундах: до dueAt+GRACE гасит только заёмщик, после — только owner забирает. 0 = жёсткий срок
const REQUEST_VALUE: Int = ton("0.12");   // хранилище -> пул (запрос займа)
const APPROVE_VALUE: Int = ton("0.05");   // пул -> хранилище (подтверждение)

contract GiftLoanPool {
    owner: Address;
    treasury: Address;
    signerKey: Int as uint256;
    maxLoan: Int as coins;

    init(owner: Address, treasury: Address, signerKey: Int, maxLoan: Int) {
        self.owner = owner;
        self.treasury = treasury;
        self.signerKey = signerKey;
        self.maxLoan = maxLoan;
    }

    receive() {} // пополнение пула и возврат тела займа

    // Создать хранилище под конкретный NFT. Параметры хранилища (пул + NFT) задаются здесь,
    // подставить чужие нельзя. Повторный вызов безвреден.
    receive(msg: DeployEscrow) {
        require(context().value >= DEPLOY_MIN, "Send at least 0.15");
        deploy(DeployParameters{
            init: initOf LoanEscrow(myAddress(), msg.nft),
            value: ESCROW_FUND,
            mode: SendPayGasSeparately,
            bounce: false
        });
    }

    // Запрос займа: принимается ТОЛЬКО от хранилища этого NFT.
    // Ошибки внутри проверки не бросаются: хранилище получает LoanRejected и возвращает NFT.
    receive(msg: LoanRequest) {
        let escrow: Address = contractAddress(initOf LoanEscrow(myAddress(), msg.nft));
        require(sender() == escrow, "Not escrow");
        let ok: Bool = false;
        let repay: Int = 0;
        try {
            let rate: Int = self.rateBps(msg.term);
            let h: Int = beginCell()
                .storeAddress(myAddress()).storeAddress(msg.nft).storeAddress(msg.borrower)
                .storeCoins(msg.principal).storeUint(msg.term, 16).storeUint(msg.exp, 32)
                .endCell().hash();
            if (rate > 0 && msg.principal > 0 && msg.principal <= self.maxLoan && now() <= msg.exp
                && myBalance() - context().value >= msg.principal + MIN_RESERVE
                && checkSignature(h, msg.sig.beginParse(), self.signerKey)) {
                let interest: Int = (msg.principal * rate + 9999) / 10000;
                repay = msg.principal + interest;
                ok = true;
            }
        } catch (e) {
            ok = false;
        }
        if (ok) {
            send(SendParameters{
                to: escrow, value: APPROVE_VALUE, mode: SendPayGasSeparately, bounce: false,
                body: LoanApproved{
                    repay: repay, principal: msg.principal,
                    dueAt: now() + msg.term * 86400,
                    owner: self.owner, treasury: self.treasury
                }.toCell()
            });
            send(SendParameters{
                to: msg.borrower, value: msg.principal, mode: SendPayGasSeparately, bounce: false
            });
        } else {
            send(SendParameters{
                to: escrow, value: 0, mode: SendRemainingValue + SendIgnoreErrors, bounce: false,
                body: LoanRejected{}.toCell()
            });
        }
    }

    // Владелец выводит свободную ликвидность
    receive(msg: Withdraw) {
        require(sender() == self.owner, "Owner only");
        require(myBalance() - msg.amount >= MIN_RESERVE, "Reserve");
        send(SendParameters{ to: self.owner, value: msg.amount, mode: SendPayGasSeparately });
    }

    receive(msg: SetMaxLoan) {
        require(sender() == self.owner, "Owner only");
        self.maxLoan = msg.value;
    }

    // Спасение NFT, который застрял в хранилище вне займа (например, при слишком малом газе).
    // Владелец обязан вернуть NFT тому, кто его отправил.
    receive(msg: RescueNft) {
        require(sender() == self.owner, "Owner only");
        send(SendParameters{
            to: contractAddress(initOf LoanEscrow(myAddress(), msg.nft)),
            value: GAS, mode: SendPayGasSeparately, bounce: true,
            body: Rescue{ to: msg.to }.toCell()
        });
    }

    // Вернуть NFT, который по ошибке отправили прямо на адрес пула. Только owner.
    // Залоговые подарки лежат в хранилищах, а не на пуле, поэтому они этой командой не затрагиваются.
    receive(msg: RescueAnyNft) {
        require(sender() == self.owner, "Owner only");
        send(SendParameters{
            to: msg.nft, value: GAS, mode: SendPayGasSeparately, bounce: true,
            body: NftTransfer{
                queryId: 0, newOwner: msg.to, responseDestination: msg.to,
                customPayload: null, forwardAmount: 0, forwardPayload: emptySlice()
            }.toCell()
        });
    }

    // Вернуть чужой NFT, застрявший в хранилище подарка escrowNft. Только owner.
    receive(msg: RescueForeignNft) {
        require(sender() == self.owner, "Owner only");
        send(SendParameters{
            to: contractAddress(initOf LoanEscrow(myAddress(), msg.escrowNft)),
            value: GAS, mode: SendPayGasSeparately, bounce: true,
            body: RescueForeign{ nft: msg.foreign, to: msg.to }.toCell()
        });
    }

    // Полная ставка за весь срок в б.п. (должна совпадать с TERMS в signer.mjs):
    // 1 день 0.5%, 7 дн 1.5%, 14 дн 4.4%, 21 дн 9.6%, 31 дн 19.9%
    fun rateBps(term: Int): Int {
        if (term == 1) { return 50; }
        if (term == 7) { return 150; }
        if (term == 14) { return 440; }
        if (term == 21) { return 960; }
        if (term == 31) { return 1990; }
        return 0;
    }

    get fun escrowAddress(nft: Address): Address {
        return contractAddress(initOf LoanEscrow(myAddress(), nft));
    }
    get fun loanLimit(): Int { return self.maxLoan; }
    get fun pool(): Int { return myBalance(); }
    get fun ownerAddress(): Address { return self.owner; }
}

contract LoanEscrow {
    pool: Address;
    nft: Address;
    status: Int as uint8 = 0;          // 0 свободно, 1 ждём пул, 2 займ выдан
    borrower: Address? = null;
    owner: Address? = null;
    treasury: Address? = null;
    principal: Int as coins = 0;
    repay: Int as coins = 0;
    dueAt: Int as uint32 = 0;

    init(pool: Address, nft: Address) {
        self.pool = pool;
        self.nft = nft;
    }

    receive() {} // принимает деплой и пополнение

    // NFT пришёл в хранилище. Любая ошибка разбора -> NFT возвращается отправителю (никогда не throw!).
    receive(msg: OwnershipAssigned) {
        let from: Address = sender();
        let ok: Bool = false;
        let principal: Int = 0;
        let term: Int = 0;
        let exp: Int = 0;
        let sig: Cell = emptyCell();
        if (from == self.nft && self.status == 0) {
            try {
                let p: Slice = msg.forwardPayload;
                if (p.loadBool()) { p = p.loadRef().beginParse(); }
                principal = p.loadCoins();
                term = p.loadUint(16);
                exp = p.loadUint(32);
                sig = p.loadRef();
                ok = true;
            } catch (e) {
                ok = false;
            }
        }
        if (ok) {
            self.status = 1;
            self.borrower = msg.prevOwner;
            send(SendParameters{
                to: self.pool, value: REQUEST_VALUE, mode: SendPayGasSeparately, bounce: true,
                body: LoanRequest{
                    nft: self.nft, borrower: msg.prevOwner, principal: principal,
                    term: term, exp: exp, sig: sig
                }.toCell()
            });
        } else {
            // чужой NFT, занятое хранилище или неверные данные -> вернуть отправителю
            self.returnNft(from, msg.prevOwner, msg.queryId, 0, SendRemainingValue + SendIgnoreErrors);
        }
    }

    receive(msg: LoanApproved) {
        require(sender() == self.pool, "Pool only");
        require(self.status == 1, "Bad state");
        self.status = 2;
        self.repay = msg.repay;
        self.principal = msg.principal;
        self.dueAt = msg.dueAt;
        self.owner = msg.owner;
        self.treasury = msg.treasury;
    }

    receive(msg: LoanRejected) {
        require(sender() == self.pool, "Pool only");
        require(self.status == 1, "Bad state");
        let to: Address = self.borrower!!;
        self.status = 0;
        self.borrower = null;
        self.returnNft(self.nft, to, 0, 0, SendRemainingValue + SendIgnoreErrors);
    }

    // Пул не ответил (запрос вернулся) -> вернуть NFT
    bounced(src: Slice) {
        if (self.status == 1) {
            let to: Address = self.borrower!!;
            self.status = 0;
            self.borrower = null;
            self.returnNft(self.nft, to, 0, 0, SendRemainingValue + SendIgnoreErrors);
        }
    }

    // Погашение: прислать repay + 0.15 GRAM. Тело -> пул, проценты -> treasury, NFT и остаток -> заёмщику.
    receive(msg: Repay) {
        require(self.status == 2, "No loan");
        let borrower: Address = self.borrower!!;
        require(sender() == borrower, "Not borrower");
        require(now() <= self.dueAt + REPAY_GRACE, "Too late");
        require(context().value >= self.repay + GAS, "Send repay + 0.15");
        let principal: Int = self.principal;
        let interest: Int = self.repay - self.principal;
        let treasury: Address = self.treasury!!;
        self.status = 0;
        self.borrower = null;
        nativeReserve(ESCROW_KEEP, 0);
        send(SendParameters{ to: self.pool, value: principal, mode: SendPayGasSeparately + SendIgnoreErrors, bounce: false });
        if (interest > 0) {
            send(SendParameters{ to: treasury, value: interest, mode: SendPayGasSeparately + SendIgnoreErrors, bounce: false });
        }
        self.returnNft(self.nft, borrower, 0, 0, SendRemainingBalance);
    }

    // Только после срока: NFT уходит владельцу пула. Раньше срока забрать нельзя.
    receive(msg: Liquidate) {
        require(self.status == 2, "No loan");
        let to: Address = self.owner!!;
        require(sender() == to, "Owner only");
        require(now() > self.dueAt + REPAY_GRACE, "Not due yet");
        self.status = 0;
        self.borrower = null;
        nativeReserve(ESCROW_KEEP, 0);
        self.returnNft(self.nft, to, 0, 0, SendRemainingBalance);
    }

    // Только от пула (по команде owner) и только когда займа нет
    receive(msg: Rescue) {
        require(sender() == self.pool, "Pool only");
        require(self.status == 0, "Loan active");
        self.returnNft(self.nft, msg.to, 0, 0, SendRemainingValue);
    }

    // Чужой NFT (не залоговый подарок этого хранилища), застрявший здесь. Только по команде owner через пул.
    // Залоговый подарок этой командой вернуть нельзя: для него есть Rescue с проверкой, что займа нет.
    receive(msg: RescueForeign) {
        require(sender() == self.pool, "Pool only");
        require(msg.nft != self.nft, "Use Rescue");
        self.returnNft(msg.nft, msg.to, 0, 0, SendRemainingValue);
    }

    fun returnNft(nft: Address, to: Address, queryId: Int, value: Int, mode: Int) {
        send(SendParameters{
            to: nft, value: value, mode: mode,
            body: NftTransfer{
                queryId: queryId, newOwner: to, responseDestination: to,
                customPayload: null, forwardAmount: 0, forwardPayload: emptySlice()
            }.toCell()
        });
    }

    get fun status(): Int { return self.status; }
    get fun repayAmount(): Int { return self.repay; }
    get fun dueAt(): Int { return self.dueAt; }
    get fun borrowerAddress(): Address? { return self.borrower; }
}
