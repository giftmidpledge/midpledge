import {
    Cell,
    Slice,
    Address,
    Builder,
    beginCell,
    ComputeError,
    TupleItem,
    TupleReader,
    Dictionary,
    contractAddress,
    address,
    ContractProvider,
    Sender,
    Contract,
    ContractABI,
    ABIType,
    ABIGetter,
    ABIReceiver,
    TupleBuilder,
    DictionaryValue
} from '@ton/core';

export type DataSize = {
    $$type: 'DataSize';
    cells: bigint;
    bits: bigint;
    refs: bigint;
}

export function storeDataSize(src: DataSize) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.cells, 257);
        b_0.storeInt(src.bits, 257);
        b_0.storeInt(src.refs, 257);
    };
}

export function loadDataSize(slice: Slice) {
    const sc_0 = slice;
    const _cells = sc_0.loadIntBig(257);
    const _bits = sc_0.loadIntBig(257);
    const _refs = sc_0.loadIntBig(257);
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadGetterTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function storeTupleDataSize(source: DataSize) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.cells);
    builder.writeNumber(source.bits);
    builder.writeNumber(source.refs);
    return builder.build();
}

export function dictValueParserDataSize(): DictionaryValue<DataSize> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDataSize(src)).endCell());
        },
        parse: (src) => {
            return loadDataSize(src.loadRef().beginParse());
        }
    }
}

export type SignedBundle = {
    $$type: 'SignedBundle';
    signature: Buffer;
    signedData: Slice;
}

export function storeSignedBundle(src: SignedBundle) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBuffer(src.signature);
        b_0.storeBuilder(src.signedData.asBuilder());
    };
}

export function loadSignedBundle(slice: Slice) {
    const sc_0 = slice;
    const _signature = sc_0.loadBuffer(64);
    const _signedData = sc_0;
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadGetterTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function storeTupleSignedBundle(source: SignedBundle) {
    const builder = new TupleBuilder();
    builder.writeBuffer(source.signature);
    builder.writeSlice(source.signedData.asCell());
    return builder.build();
}

export function dictValueParserSignedBundle(): DictionaryValue<SignedBundle> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSignedBundle(src)).endCell());
        },
        parse: (src) => {
            return loadSignedBundle(src.loadRef().beginParse());
        }
    }
}

export type StateInit = {
    $$type: 'StateInit';
    code: Cell;
    data: Cell;
}

export function storeStateInit(src: StateInit) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeRef(src.code);
        b_0.storeRef(src.data);
    };
}

export function loadStateInit(slice: Slice) {
    const sc_0 = slice;
    const _code = sc_0.loadRef();
    const _data = sc_0.loadRef();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadGetterTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function storeTupleStateInit(source: StateInit) {
    const builder = new TupleBuilder();
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

export function dictValueParserStateInit(): DictionaryValue<StateInit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStateInit(src)).endCell());
        },
        parse: (src) => {
            return loadStateInit(src.loadRef().beginParse());
        }
    }
}

export type Context = {
    $$type: 'Context';
    bounceable: boolean;
    sender: Address;
    value: bigint;
    raw: Slice;
}

export function storeContext(src: Context) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBit(src.bounceable);
        b_0.storeAddress(src.sender);
        b_0.storeInt(src.value, 257);
        b_0.storeRef(src.raw.asCell());
    };
}

export function loadContext(slice: Slice) {
    const sc_0 = slice;
    const _bounceable = sc_0.loadBit();
    const _sender = sc_0.loadAddress();
    const _value = sc_0.loadIntBig(257);
    const _raw = sc_0.loadRef().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadGetterTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function storeTupleContext(source: Context) {
    const builder = new TupleBuilder();
    builder.writeBoolean(source.bounceable);
    builder.writeAddress(source.sender);
    builder.writeNumber(source.value);
    builder.writeSlice(source.raw.asCell());
    return builder.build();
}

export function dictValueParserContext(): DictionaryValue<Context> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeContext(src)).endCell());
        },
        parse: (src) => {
            return loadContext(src.loadRef().beginParse());
        }
    }
}

export type SendParameters = {
    $$type: 'SendParameters';
    mode: bigint;
    body: Cell | null;
    code: Cell | null;
    data: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeSendParameters(src: SendParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        if (src.code !== null && src.code !== undefined) { b_0.storeBit(true).storeRef(src.code); } else { b_0.storeBit(false); }
        if (src.data !== null && src.data !== undefined) { b_0.storeBit(true).storeRef(src.data); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadSendParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _code = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _data = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleSendParameters(source: SendParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserSendParameters(): DictionaryValue<SendParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSendParameters(src)).endCell());
        },
        parse: (src) => {
            return loadSendParameters(src.loadRef().beginParse());
        }
    }
}

export type MessageParameters = {
    $$type: 'MessageParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeMessageParameters(src: MessageParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadMessageParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleMessageParameters(source: MessageParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserMessageParameters(): DictionaryValue<MessageParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMessageParameters(src)).endCell());
        },
        parse: (src) => {
            return loadMessageParameters(src.loadRef().beginParse());
        }
    }
}

export type DeployParameters = {
    $$type: 'DeployParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    bounce: boolean;
    init: StateInit;
}

export function storeDeployParameters(src: DeployParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeBit(src.bounce);
        b_0.store(storeStateInit(src.init));
    };
}

export function loadDeployParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _bounce = sc_0.loadBit();
    const _init = loadStateInit(sc_0);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadGetterTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadGetterTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function storeTupleDeployParameters(source: DeployParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeBoolean(source.bounce);
    builder.writeTuple(storeTupleStateInit(source.init));
    return builder.build();
}

export function dictValueParserDeployParameters(): DictionaryValue<DeployParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployParameters(src)).endCell());
        },
        parse: (src) => {
            return loadDeployParameters(src.loadRef().beginParse());
        }
    }
}

export type StdAddress = {
    $$type: 'StdAddress';
    workchain: bigint;
    address: bigint;
}

export function storeStdAddress(src: StdAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 8);
        b_0.storeUint(src.address, 256);
    };
}

export function loadStdAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(8);
    const _address = sc_0.loadUintBig(256);
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleStdAddress(source: StdAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeNumber(source.address);
    return builder.build();
}

export function dictValueParserStdAddress(): DictionaryValue<StdAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStdAddress(src)).endCell());
        },
        parse: (src) => {
            return loadStdAddress(src.loadRef().beginParse());
        }
    }
}

export type VarAddress = {
    $$type: 'VarAddress';
    workchain: bigint;
    address: Slice;
}

export function storeVarAddress(src: VarAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 32);
        b_0.storeRef(src.address.asCell());
    };
}

export function loadVarAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(32);
    const _address = sc_0.loadRef().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleVarAddress(source: VarAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeSlice(source.address.asCell());
    return builder.build();
}

export function dictValueParserVarAddress(): DictionaryValue<VarAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeVarAddress(src)).endCell());
        },
        parse: (src) => {
            return loadVarAddress(src.loadRef().beginParse());
        }
    }
}

export type BasechainAddress = {
    $$type: 'BasechainAddress';
    hash: bigint | null;
}

export function storeBasechainAddress(src: BasechainAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        if (src.hash !== null && src.hash !== undefined) { b_0.storeBit(true).storeInt(src.hash, 257); } else { b_0.storeBit(false); }
    };
}

export function loadBasechainAddress(slice: Slice) {
    const sc_0 = slice;
    const _hash = sc_0.loadBit() ? sc_0.loadIntBig(257) : null;
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadGetterTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function storeTupleBasechainAddress(source: BasechainAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.hash);
    return builder.build();
}

export function dictValueParserBasechainAddress(): DictionaryValue<BasechainAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeBasechainAddress(src)).endCell());
        },
        parse: (src) => {
            return loadBasechainAddress(src.loadRef().beginParse());
        }
    }
}

export type OwnershipAssigned = {
    $$type: 'OwnershipAssigned';
    queryId: bigint;
    prevOwner: Address;
    forwardPayload: Slice;
}

export function storeOwnershipAssigned(src: OwnershipAssigned) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(85167505, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.prevOwner);
        b_0.storeBuilder(src.forwardPayload.asBuilder());
    };
}

export function loadOwnershipAssigned(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 85167505) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _prevOwner = sc_0.loadAddress();
    const _forwardPayload = sc_0;
    return { $$type: 'OwnershipAssigned' as const, queryId: _queryId, prevOwner: _prevOwner, forwardPayload: _forwardPayload };
}

export function loadTupleOwnershipAssigned(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _prevOwner = source.readAddress();
    const _forwardPayload = source.readCell().asSlice();
    return { $$type: 'OwnershipAssigned' as const, queryId: _queryId, prevOwner: _prevOwner, forwardPayload: _forwardPayload };
}

export function loadGetterTupleOwnershipAssigned(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _prevOwner = source.readAddress();
    const _forwardPayload = source.readCell().asSlice();
    return { $$type: 'OwnershipAssigned' as const, queryId: _queryId, prevOwner: _prevOwner, forwardPayload: _forwardPayload };
}

export function storeTupleOwnershipAssigned(source: OwnershipAssigned) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.prevOwner);
    builder.writeSlice(source.forwardPayload.asCell());
    return builder.build();
}

export function dictValueParserOwnershipAssigned(): DictionaryValue<OwnershipAssigned> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeOwnershipAssigned(src)).endCell());
        },
        parse: (src) => {
            return loadOwnershipAssigned(src.loadRef().beginParse());
        }
    }
}

export type NftTransfer = {
    $$type: 'NftTransfer';
    queryId: bigint;
    newOwner: Address;
    responseDestination: Address | null;
    customPayload: Cell | null;
    forwardAmount: bigint;
    forwardPayload: Slice;
}

export function storeNftTransfer(src: NftTransfer) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1607220500, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.newOwner);
        b_0.storeAddress(src.responseDestination);
        if (src.customPayload !== null && src.customPayload !== undefined) { b_0.storeBit(true).storeRef(src.customPayload); } else { b_0.storeBit(false); }
        b_0.storeCoins(src.forwardAmount);
        b_0.storeBuilder(src.forwardPayload.asBuilder());
    };
}

export function loadNftTransfer(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1607220500) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _newOwner = sc_0.loadAddress();
    const _responseDestination = sc_0.loadMaybeAddress();
    const _customPayload = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _forwardAmount = sc_0.loadCoins();
    const _forwardPayload = sc_0;
    return { $$type: 'NftTransfer' as const, queryId: _queryId, newOwner: _newOwner, responseDestination: _responseDestination, customPayload: _customPayload, forwardAmount: _forwardAmount, forwardPayload: _forwardPayload };
}

export function loadTupleNftTransfer(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _newOwner = source.readAddress();
    const _responseDestination = source.readAddressOpt();
    const _customPayload = source.readCellOpt();
    const _forwardAmount = source.readBigNumber();
    const _forwardPayload = source.readCell().asSlice();
    return { $$type: 'NftTransfer' as const, queryId: _queryId, newOwner: _newOwner, responseDestination: _responseDestination, customPayload: _customPayload, forwardAmount: _forwardAmount, forwardPayload: _forwardPayload };
}

export function loadGetterTupleNftTransfer(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _newOwner = source.readAddress();
    const _responseDestination = source.readAddressOpt();
    const _customPayload = source.readCellOpt();
    const _forwardAmount = source.readBigNumber();
    const _forwardPayload = source.readCell().asSlice();
    return { $$type: 'NftTransfer' as const, queryId: _queryId, newOwner: _newOwner, responseDestination: _responseDestination, customPayload: _customPayload, forwardAmount: _forwardAmount, forwardPayload: _forwardPayload };
}

export function storeTupleNftTransfer(source: NftTransfer) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.newOwner);
    builder.writeAddress(source.responseDestination);
    builder.writeCell(source.customPayload);
    builder.writeNumber(source.forwardAmount);
    builder.writeSlice(source.forwardPayload.asCell());
    return builder.build();
}

export function dictValueParserNftTransfer(): DictionaryValue<NftTransfer> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeNftTransfer(src)).endCell());
        },
        parse: (src) => {
            return loadNftTransfer(src.loadRef().beginParse());
        }
    }
}

export type DeployEscrow = {
    $$type: 'DeployEscrow';
    nft: Address;
}

export function storeDeployEscrow(src: DeployEscrow) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2953982992, 32);
        b_0.storeAddress(src.nft);
    };
}

export function loadDeployEscrow(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2953982992) { throw Error('Invalid prefix'); }
    const _nft = sc_0.loadAddress();
    return { $$type: 'DeployEscrow' as const, nft: _nft };
}

export function loadTupleDeployEscrow(source: TupleReader) {
    const _nft = source.readAddress();
    return { $$type: 'DeployEscrow' as const, nft: _nft };
}

export function loadGetterTupleDeployEscrow(source: TupleReader) {
    const _nft = source.readAddress();
    return { $$type: 'DeployEscrow' as const, nft: _nft };
}

export function storeTupleDeployEscrow(source: DeployEscrow) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.nft);
    return builder.build();
}

export function dictValueParserDeployEscrow(): DictionaryValue<DeployEscrow> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployEscrow(src)).endCell());
        },
        parse: (src) => {
            return loadDeployEscrow(src.loadRef().beginParse());
        }
    }
}

export type LoanRequest = {
    $$type: 'LoanRequest';
    nft: Address;
    borrower: Address;
    principal: bigint;
    term: bigint;
    exp: bigint;
    sig: Cell;
}

export function storeLoanRequest(src: LoanRequest) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2953982993, 32);
        b_0.storeAddress(src.nft);
        b_0.storeAddress(src.borrower);
        b_0.storeCoins(src.principal);
        b_0.storeUint(src.term, 16);
        b_0.storeUint(src.exp, 32);
        b_0.storeRef(src.sig);
    };
}

export function loadLoanRequest(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2953982993) { throw Error('Invalid prefix'); }
    const _nft = sc_0.loadAddress();
    const _borrower = sc_0.loadAddress();
    const _principal = sc_0.loadCoins();
    const _term = sc_0.loadUintBig(16);
    const _exp = sc_0.loadUintBig(32);
    const _sig = sc_0.loadRef();
    return { $$type: 'LoanRequest' as const, nft: _nft, borrower: _borrower, principal: _principal, term: _term, exp: _exp, sig: _sig };
}

export function loadTupleLoanRequest(source: TupleReader) {
    const _nft = source.readAddress();
    const _borrower = source.readAddress();
    const _principal = source.readBigNumber();
    const _term = source.readBigNumber();
    const _exp = source.readBigNumber();
    const _sig = source.readCell();
    return { $$type: 'LoanRequest' as const, nft: _nft, borrower: _borrower, principal: _principal, term: _term, exp: _exp, sig: _sig };
}

export function loadGetterTupleLoanRequest(source: TupleReader) {
    const _nft = source.readAddress();
    const _borrower = source.readAddress();
    const _principal = source.readBigNumber();
    const _term = source.readBigNumber();
    const _exp = source.readBigNumber();
    const _sig = source.readCell();
    return { $$type: 'LoanRequest' as const, nft: _nft, borrower: _borrower, principal: _principal, term: _term, exp: _exp, sig: _sig };
}

export function storeTupleLoanRequest(source: LoanRequest) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.nft);
    builder.writeAddress(source.borrower);
    builder.writeNumber(source.principal);
    builder.writeNumber(source.term);
    builder.writeNumber(source.exp);
    builder.writeCell(source.sig);
    return builder.build();
}

export function dictValueParserLoanRequest(): DictionaryValue<LoanRequest> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeLoanRequest(src)).endCell());
        },
        parse: (src) => {
            return loadLoanRequest(src.loadRef().beginParse());
        }
    }
}

export type LoanApproved = {
    $$type: 'LoanApproved';
    repay: bigint;
    principal: bigint;
    dueAt: bigint;
    owner: Address;
    treasury: Address;
}

export function storeLoanApproved(src: LoanApproved) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2953982994, 32);
        b_0.storeCoins(src.repay);
        b_0.storeCoins(src.principal);
        b_0.storeUint(src.dueAt, 32);
        b_0.storeAddress(src.owner);
        b_0.storeAddress(src.treasury);
    };
}

export function loadLoanApproved(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2953982994) { throw Error('Invalid prefix'); }
    const _repay = sc_0.loadCoins();
    const _principal = sc_0.loadCoins();
    const _dueAt = sc_0.loadUintBig(32);
    const _owner = sc_0.loadAddress();
    const _treasury = sc_0.loadAddress();
    return { $$type: 'LoanApproved' as const, repay: _repay, principal: _principal, dueAt: _dueAt, owner: _owner, treasury: _treasury };
}

export function loadTupleLoanApproved(source: TupleReader) {
    const _repay = source.readBigNumber();
    const _principal = source.readBigNumber();
    const _dueAt = source.readBigNumber();
    const _owner = source.readAddress();
    const _treasury = source.readAddress();
    return { $$type: 'LoanApproved' as const, repay: _repay, principal: _principal, dueAt: _dueAt, owner: _owner, treasury: _treasury };
}

export function loadGetterTupleLoanApproved(source: TupleReader) {
    const _repay = source.readBigNumber();
    const _principal = source.readBigNumber();
    const _dueAt = source.readBigNumber();
    const _owner = source.readAddress();
    const _treasury = source.readAddress();
    return { $$type: 'LoanApproved' as const, repay: _repay, principal: _principal, dueAt: _dueAt, owner: _owner, treasury: _treasury };
}

export function storeTupleLoanApproved(source: LoanApproved) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.repay);
    builder.writeNumber(source.principal);
    builder.writeNumber(source.dueAt);
    builder.writeAddress(source.owner);
    builder.writeAddress(source.treasury);
    return builder.build();
}

export function dictValueParserLoanApproved(): DictionaryValue<LoanApproved> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeLoanApproved(src)).endCell());
        },
        parse: (src) => {
            return loadLoanApproved(src.loadRef().beginParse());
        }
    }
}

export type LoanRejected = {
    $$type: 'LoanRejected';
}

export function storeLoanRejected(src: LoanRejected) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2953982995, 32);
    };
}

export function loadLoanRejected(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2953982995) { throw Error('Invalid prefix'); }
    return { $$type: 'LoanRejected' as const };
}

export function loadTupleLoanRejected(source: TupleReader) {
    return { $$type: 'LoanRejected' as const };
}

export function loadGetterTupleLoanRejected(source: TupleReader) {
    return { $$type: 'LoanRejected' as const };
}

export function storeTupleLoanRejected(source: LoanRejected) {
    const builder = new TupleBuilder();
    return builder.build();
}

export function dictValueParserLoanRejected(): DictionaryValue<LoanRejected> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeLoanRejected(src)).endCell());
        },
        parse: (src) => {
            return loadLoanRejected(src.loadRef().beginParse());
        }
    }
}

export type RescueNft = {
    $$type: 'RescueNft';
    nft: Address;
    to: Address;
}

export function storeRescueNft(src: RescueNft) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2953982996, 32);
        b_0.storeAddress(src.nft);
        b_0.storeAddress(src.to);
    };
}

export function loadRescueNft(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2953982996) { throw Error('Invalid prefix'); }
    const _nft = sc_0.loadAddress();
    const _to = sc_0.loadAddress();
    return { $$type: 'RescueNft' as const, nft: _nft, to: _to };
}

export function loadTupleRescueNft(source: TupleReader) {
    const _nft = source.readAddress();
    const _to = source.readAddress();
    return { $$type: 'RescueNft' as const, nft: _nft, to: _to };
}

export function loadGetterTupleRescueNft(source: TupleReader) {
    const _nft = source.readAddress();
    const _to = source.readAddress();
    return { $$type: 'RescueNft' as const, nft: _nft, to: _to };
}

export function storeTupleRescueNft(source: RescueNft) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.nft);
    builder.writeAddress(source.to);
    return builder.build();
}

export function dictValueParserRescueNft(): DictionaryValue<RescueNft> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRescueNft(src)).endCell());
        },
        parse: (src) => {
            return loadRescueNft(src.loadRef().beginParse());
        }
    }
}

export type Rescue = {
    $$type: 'Rescue';
    to: Address;
}

export function storeRescue(src: Rescue) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2953982997, 32);
        b_0.storeAddress(src.to);
    };
}

export function loadRescue(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2953982997) { throw Error('Invalid prefix'); }
    const _to = sc_0.loadAddress();
    return { $$type: 'Rescue' as const, to: _to };
}

export function loadTupleRescue(source: TupleReader) {
    const _to = source.readAddress();
    return { $$type: 'Rescue' as const, to: _to };
}

export function loadGetterTupleRescue(source: TupleReader) {
    const _to = source.readAddress();
    return { $$type: 'Rescue' as const, to: _to };
}

export function storeTupleRescue(source: Rescue) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.to);
    return builder.build();
}

export function dictValueParserRescue(): DictionaryValue<Rescue> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRescue(src)).endCell());
        },
        parse: (src) => {
            return loadRescue(src.loadRef().beginParse());
        }
    }
}

export type Repay = {
    $$type: 'Repay';
}

export function storeRepay(src: Repay) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2953982978, 32);
    };
}

export function loadRepay(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2953982978) { throw Error('Invalid prefix'); }
    return { $$type: 'Repay' as const };
}

export function loadTupleRepay(source: TupleReader) {
    return { $$type: 'Repay' as const };
}

export function loadGetterTupleRepay(source: TupleReader) {
    return { $$type: 'Repay' as const };
}

export function storeTupleRepay(source: Repay) {
    const builder = new TupleBuilder();
    return builder.build();
}

export function dictValueParserRepay(): DictionaryValue<Repay> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRepay(src)).endCell());
        },
        parse: (src) => {
            return loadRepay(src.loadRef().beginParse());
        }
    }
}

export type Liquidate = {
    $$type: 'Liquidate';
}

export function storeLiquidate(src: Liquidate) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2953982979, 32);
    };
}

export function loadLiquidate(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2953982979) { throw Error('Invalid prefix'); }
    return { $$type: 'Liquidate' as const };
}

export function loadTupleLiquidate(source: TupleReader) {
    return { $$type: 'Liquidate' as const };
}

export function loadGetterTupleLiquidate(source: TupleReader) {
    return { $$type: 'Liquidate' as const };
}

export function storeTupleLiquidate(source: Liquidate) {
    const builder = new TupleBuilder();
    return builder.build();
}

export function dictValueParserLiquidate(): DictionaryValue<Liquidate> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeLiquidate(src)).endCell());
        },
        parse: (src) => {
            return loadLiquidate(src.loadRef().beginParse());
        }
    }
}

export type Withdraw = {
    $$type: 'Withdraw';
    amount: bigint;
}

export function storeWithdraw(src: Withdraw) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2953982980, 32);
        b_0.storeCoins(src.amount);
    };
}

export function loadWithdraw(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2953982980) { throw Error('Invalid prefix'); }
    const _amount = sc_0.loadCoins();
    return { $$type: 'Withdraw' as const, amount: _amount };
}

export function loadTupleWithdraw(source: TupleReader) {
    const _amount = source.readBigNumber();
    return { $$type: 'Withdraw' as const, amount: _amount };
}

export function loadGetterTupleWithdraw(source: TupleReader) {
    const _amount = source.readBigNumber();
    return { $$type: 'Withdraw' as const, amount: _amount };
}

export function storeTupleWithdraw(source: Withdraw) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.amount);
    return builder.build();
}

export function dictValueParserWithdraw(): DictionaryValue<Withdraw> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeWithdraw(src)).endCell());
        },
        parse: (src) => {
            return loadWithdraw(src.loadRef().beginParse());
        }
    }
}

export type SetMaxLoan = {
    $$type: 'SetMaxLoan';
    value: bigint;
}

export function storeSetMaxLoan(src: SetMaxLoan) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2953982981, 32);
        b_0.storeCoins(src.value);
    };
}

export function loadSetMaxLoan(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2953982981) { throw Error('Invalid prefix'); }
    const _value = sc_0.loadCoins();
    return { $$type: 'SetMaxLoan' as const, value: _value };
}

export function loadTupleSetMaxLoan(source: TupleReader) {
    const _value = source.readBigNumber();
    return { $$type: 'SetMaxLoan' as const, value: _value };
}

export function loadGetterTupleSetMaxLoan(source: TupleReader) {
    const _value = source.readBigNumber();
    return { $$type: 'SetMaxLoan' as const, value: _value };
}

export function storeTupleSetMaxLoan(source: SetMaxLoan) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.value);
    return builder.build();
}

export function dictValueParserSetMaxLoan(): DictionaryValue<SetMaxLoan> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSetMaxLoan(src)).endCell());
        },
        parse: (src) => {
            return loadSetMaxLoan(src.loadRef().beginParse());
        }
    }
}

export type GiftLoanPool$Data = {
    $$type: 'GiftLoanPool$Data';
    owner: Address;
    treasury: Address;
    signerKey: bigint;
    maxLoan: bigint;
}

export function storeGiftLoanPool$Data(src: GiftLoanPool$Data) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeAddress(src.treasury);
        b_0.storeUint(src.signerKey, 256);
        b_0.storeCoins(src.maxLoan);
    };
}

export function loadGiftLoanPool$Data(slice: Slice) {
    const sc_0 = slice;
    const _owner = sc_0.loadAddress();
    const _treasury = sc_0.loadAddress();
    const _signerKey = sc_0.loadUintBig(256);
    const _maxLoan = sc_0.loadCoins();
    return { $$type: 'GiftLoanPool$Data' as const, owner: _owner, treasury: _treasury, signerKey: _signerKey, maxLoan: _maxLoan };
}

export function loadTupleGiftLoanPool$Data(source: TupleReader) {
    const _owner = source.readAddress();
    const _treasury = source.readAddress();
    const _signerKey = source.readBigNumber();
    const _maxLoan = source.readBigNumber();
    return { $$type: 'GiftLoanPool$Data' as const, owner: _owner, treasury: _treasury, signerKey: _signerKey, maxLoan: _maxLoan };
}

export function loadGetterTupleGiftLoanPool$Data(source: TupleReader) {
    const _owner = source.readAddress();
    const _treasury = source.readAddress();
    const _signerKey = source.readBigNumber();
    const _maxLoan = source.readBigNumber();
    return { $$type: 'GiftLoanPool$Data' as const, owner: _owner, treasury: _treasury, signerKey: _signerKey, maxLoan: _maxLoan };
}

export function storeTupleGiftLoanPool$Data(source: GiftLoanPool$Data) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.owner);
    builder.writeAddress(source.treasury);
    builder.writeNumber(source.signerKey);
    builder.writeNumber(source.maxLoan);
    return builder.build();
}

export function dictValueParserGiftLoanPool$Data(): DictionaryValue<GiftLoanPool$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeGiftLoanPool$Data(src)).endCell());
        },
        parse: (src) => {
            return loadGiftLoanPool$Data(src.loadRef().beginParse());
        }
    }
}

export type LoanEscrow$Data = {
    $$type: 'LoanEscrow$Data';
    pool: Address;
    nft: Address;
    status: bigint;
    borrower: Address | null;
    owner: Address | null;
    treasury: Address | null;
    principal: bigint;
    repay: bigint;
    dueAt: bigint;
}

export function storeLoanEscrow$Data(src: LoanEscrow$Data) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.pool);
        b_0.storeAddress(src.nft);
        b_0.storeUint(src.status, 8);
        b_0.storeAddress(src.borrower);
        const b_1 = new Builder();
        b_1.storeAddress(src.owner);
        b_1.storeAddress(src.treasury);
        b_1.storeCoins(src.principal);
        b_1.storeCoins(src.repay);
        b_1.storeUint(src.dueAt, 32);
        b_0.storeRef(b_1.endCell());
    };
}

export function loadLoanEscrow$Data(slice: Slice) {
    const sc_0 = slice;
    const _pool = sc_0.loadAddress();
    const _nft = sc_0.loadAddress();
    const _status = sc_0.loadUintBig(8);
    const _borrower = sc_0.loadMaybeAddress();
    const sc_1 = sc_0.loadRef().beginParse();
    const _owner = sc_1.loadMaybeAddress();
    const _treasury = sc_1.loadMaybeAddress();
    const _principal = sc_1.loadCoins();
    const _repay = sc_1.loadCoins();
    const _dueAt = sc_1.loadUintBig(32);
    return { $$type: 'LoanEscrow$Data' as const, pool: _pool, nft: _nft, status: _status, borrower: _borrower, owner: _owner, treasury: _treasury, principal: _principal, repay: _repay, dueAt: _dueAt };
}

export function loadTupleLoanEscrow$Data(source: TupleReader) {
    const _pool = source.readAddress();
    const _nft = source.readAddress();
    const _status = source.readBigNumber();
    const _borrower = source.readAddressOpt();
    const _owner = source.readAddressOpt();
    const _treasury = source.readAddressOpt();
    const _principal = source.readBigNumber();
    const _repay = source.readBigNumber();
    const _dueAt = source.readBigNumber();
    return { $$type: 'LoanEscrow$Data' as const, pool: _pool, nft: _nft, status: _status, borrower: _borrower, owner: _owner, treasury: _treasury, principal: _principal, repay: _repay, dueAt: _dueAt };
}

export function loadGetterTupleLoanEscrow$Data(source: TupleReader) {
    const _pool = source.readAddress();
    const _nft = source.readAddress();
    const _status = source.readBigNumber();
    const _borrower = source.readAddressOpt();
    const _owner = source.readAddressOpt();
    const _treasury = source.readAddressOpt();
    const _principal = source.readBigNumber();
    const _repay = source.readBigNumber();
    const _dueAt = source.readBigNumber();
    return { $$type: 'LoanEscrow$Data' as const, pool: _pool, nft: _nft, status: _status, borrower: _borrower, owner: _owner, treasury: _treasury, principal: _principal, repay: _repay, dueAt: _dueAt };
}

export function storeTupleLoanEscrow$Data(source: LoanEscrow$Data) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.pool);
    builder.writeAddress(source.nft);
    builder.writeNumber(source.status);
    builder.writeAddress(source.borrower);
    builder.writeAddress(source.owner);
    builder.writeAddress(source.treasury);
    builder.writeNumber(source.principal);
    builder.writeNumber(source.repay);
    builder.writeNumber(source.dueAt);
    return builder.build();
}

export function dictValueParserLoanEscrow$Data(): DictionaryValue<LoanEscrow$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeLoanEscrow$Data(src)).endCell());
        },
        parse: (src) => {
            return loadLoanEscrow$Data(src.loadRef().beginParse());
        }
    }
}

 type LoanEscrow_init_args = {
    $$type: 'LoanEscrow_init_args';
    pool: Address;
    nft: Address;
}

function initLoanEscrow_init_args(src: LoanEscrow_init_args) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.pool);
        b_0.storeAddress(src.nft);
    };
}

async function LoanEscrow_init(pool: Address, nft: Address) {
    const __code = Cell.fromHex('b5ee9c7241021e010007d2000228ff008e88f4a413f4bcf2c80bed5320e303ed43d9010c020271020401b5bcf4ff6a268690000c71dfd207d206983eb9600c8b6c9fd2000f100ea00e86b9600c8b6c9fd2000f100eb9600c8b6c9fd2000f100fd007d00698f98082c882c082b882b360ccffd207d202c816880b836b6b6aa3999f16d9e3648c03000220020120050701b5b8d0aed44d0d200018e3bfa40fa40d307d72c01916d93fa4001e201d401d0d72c01916d93fa4001e201d72c01916d93fa4001e201fa00fa00d31f3010591058105710566c199ffa40fa405902d101706d6d6d547333e2db3c6c91806000226020120080a01b5b50f7da89a1a400031c77f481f481a60fae580322db27f48003c403a803a1ae580322db27f48003c403ae580322db27f48003c403f401f401a63e6020b220b020ae20acd8333ff481f480b205a202e0dadadaa8e667c5b678d92300900022501b5b477fda89a1a400031c77f481f481a60fae580322db27f48003c403a803a1ae580322db27f48003c403ae580322db27f48003c403f401f401a63e6020b220b020ae20acd8333ff481f480b205a202e0dadadaa8e667c5b678d92300b00022103f23001d072d721d200d200fa4021103450666f04f86102f862ed44d0d200018e3bfa40fa40d307d72c01916d93fa4001e201d401d0d72c01916d93fa4001e201d72c01916d93fa4001e201fa00fa00d31f3010591058105710566c199ffa40fa405902d101706d6d6d547333e20ae3027029d74920c21fe300210d0e0f01d43824c0018e9e3402206ef2d080706d53112810ac0b104a1039106845558042db3c085551de10685515c87f01ca0055805089ce16ce14cb0758206e9430cf84809201cee2c858206e9430cf84809201cee258206e9430cf84809201cee258fa0258fa0212cb1fcdc9ed541b000a3109d31f0a045e821005138d91ba8f9d5b08d33ffa40f8427070530088535ec705932dc0009170e29136e30d03e0218210b0123412ba10111214000000ec2f514f514f514f514f514f514f04561704561904561104561104561004ed41ed43ed44ed45ed47925b70ed67ed65ed64ed63ed6180107fed118e213001d2000193d430d0defa00d30fd31fd43010df10ce10bd10ac109b108a10797fed41edf101f2ff08111008109f108e109d5e38108a503305441402c88e9b10345f04109b108a1079106810571046103502708042db3c085551e30d10685515c87f01ca0055805089ce16ce14cb0758206e9430cf84809201cee2c858206e9430cf84809201cee258206e9430cf84809201cee258fa0258fa0212cb1fcdc9ed541b1300da333538387122821007270e00227f2d05104710384dc6c855508210b01234115007cb1f15ce13ce01fa02cb0fcb1fccc92a044913508810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0002f48e6c5f063503fa00fa00d31ffa40fa4030813c65f84228c705f2f481385e08c00118f2f4105710467206054343c87f01ca0055805089ce16ce14cb0758206e9430cf84809201cee2c858206e9430cf84809201cee258206e9430cf84809201cee258fa0258fa0212cb1fcdc9ed54e0218210b0123413bae30221151601e05b38813c65f84228c705f2f481385e05c00115f2f402206ef2d080706d53112810ac0b104a1039106845558042db3cc87f01ca0055805089ce16ce14cb0758206e9430cf84809201cee2c858206e9430cf84809201cee258206e9430cf84809201cee258fa0258fa0212cb1fcdc9ed541b04be8210b0123402bae302218210b0123403ba8f435b34378116b704c00214f2f420206ef2d0808200e240f84222c705f2f4814868f82329bcf2f4706d8209312d0022fb0253112810ac0b104a103906080745558306db3ce0218210b0123415ba171b191a01fe5b388116b705c00215f2f402206ef2d080814f1ff84222c705f2f4816960f8416f24135f0328821008f0d180a0bef2f4547363a124206ef2d080706d8209312d0022fb0252a57370136d6d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb001802ae22c2008e3a027370136d6d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00926c21e253002810ac0b103a10491068051034598306db3c1b190082c87f01ca0055805089ce16ce14cb0758206e9430cf84809201cee2c858206e9430cf84809201cee258206e9430cf84809201cee258fa0258fa0212cb1fcdc9ed5403fe8ef05b08fa4030813c65f84229c705f2f48200857726c000f2f470530710ac0b108a10791068105710460555208040db3cc87f01ca0055805089ce16ce14cb0758206e9430cf84809201cee2c858206e9430cf84809201cee258206e9430cf84809201cee258fa0258fa0212cb1fcdc9ed54e03ac00009c12119b0e3025f091b1c1d00ce6d708b0826105604075520c8555082105fcc3d145007cb1f15cb3f13ce01206e9430cf84809201cee2f40001fa02cec9125a6d6d40037fc8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00008a10685515c87f01ca0055805089ce16ce14cb0758206e9430cf84809201cee2c858206e9430cf84809201cee258206e9430cf84809201cee258fa0258fa0212cb1fcdc9ed540006f2c082caef84e2');
    const builder = beginCell();
    builder.storeUint(0, 1);
    initLoanEscrow_init_args({ $$type: 'LoanEscrow_init_args', pool, nft })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

export const LoanEscrow_errors = {
    2: { message: "Stack underflow" },
    3: { message: "Stack overflow" },
    4: { message: "Integer overflow" },
    5: { message: "Integer out of expected range" },
    6: { message: "Invalid opcode" },
    7: { message: "Type check error" },
    8: { message: "Cell overflow" },
    9: { message: "Cell underflow" },
    10: { message: "Dictionary error" },
    11: { message: "'Unknown' error" },
    12: { message: "Fatal error" },
    13: { message: "Out of gas error" },
    14: { message: "Virtualization error" },
    32: { message: "Action list is invalid" },
    33: { message: "Action list is too long" },
    34: { message: "Action is invalid or not supported" },
    35: { message: "Invalid source address in outbound message" },
    36: { message: "Invalid destination address in outbound message" },
    37: { message: "Not enough Toncoin" },
    38: { message: "Not enough extra currencies" },
    39: { message: "Outbound message does not fit into a cell after rewriting" },
    40: { message: "Cannot process a message" },
    41: { message: "Library reference is null" },
    42: { message: "Library change action error" },
    43: { message: "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree" },
    50: { message: "Account state size exceeded limits" },
    128: { message: "Null reference exception" },
    129: { message: "Invalid serialization prefix" },
    130: { message: "Invalid incoming message" },
    131: { message: "Constraints error" },
    132: { message: "Access denied" },
    133: { message: "Contract stopped" },
    134: { message: "Invalid argument" },
    135: { message: "Code of a contract was not found" },
    136: { message: "Invalid standard address" },
    138: { message: "Not a basechain address" },
    5815: { message: "No loan" },
    11244: { message: "Not escrow" },
    14430: { message: "Bad state" },
    15461: { message: "Pool only" },
    18536: { message: "Not due yet" },
    20255: { message: "Not borrower" },
    26976: { message: "Send repay + 0.15" },
    34167: { message: "Loan active" },
    44940: { message: "Reserve" },
    57920: { message: "Owner only" },
    62132: { message: "Send at least 0.15" },
} as const

export const LoanEscrow_errors_backward = {
    "Stack underflow": 2,
    "Stack overflow": 3,
    "Integer overflow": 4,
    "Integer out of expected range": 5,
    "Invalid opcode": 6,
    "Type check error": 7,
    "Cell overflow": 8,
    "Cell underflow": 9,
    "Dictionary error": 10,
    "'Unknown' error": 11,
    "Fatal error": 12,
    "Out of gas error": 13,
    "Virtualization error": 14,
    "Action list is invalid": 32,
    "Action list is too long": 33,
    "Action is invalid or not supported": 34,
    "Invalid source address in outbound message": 35,
    "Invalid destination address in outbound message": 36,
    "Not enough Toncoin": 37,
    "Not enough extra currencies": 38,
    "Outbound message does not fit into a cell after rewriting": 39,
    "Cannot process a message": 40,
    "Library reference is null": 41,
    "Library change action error": 42,
    "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree": 43,
    "Account state size exceeded limits": 50,
    "Null reference exception": 128,
    "Invalid serialization prefix": 129,
    "Invalid incoming message": 130,
    "Constraints error": 131,
    "Access denied": 132,
    "Contract stopped": 133,
    "Invalid argument": 134,
    "Code of a contract was not found": 135,
    "Invalid standard address": 136,
    "Not a basechain address": 138,
    "No loan": 5815,
    "Not escrow": 11244,
    "Bad state": 14430,
    "Pool only": 15461,
    "Not due yet": 18536,
    "Not borrower": 20255,
    "Send repay + 0.15": 26976,
    "Loan active": 34167,
    "Reserve": 44940,
    "Owner only": 57920,
    "Send at least 0.15": 62132,
} as const

const LoanEscrow_types: ABIType[] = [
    {"name":"DataSize","header":null,"fields":[{"name":"cells","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bits","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"refs","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"SignedBundle","header":null,"fields":[{"name":"signature","type":{"kind":"simple","type":"fixed-bytes","optional":false,"format":64}},{"name":"signedData","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounceable","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"MessageParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"DeployParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"init","type":{"kind":"simple","type":"StateInit","optional":false}}]},
    {"name":"StdAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":8}},{"name":"address","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"VarAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":32}},{"name":"address","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"BasechainAddress","header":null,"fields":[{"name":"hash","type":{"kind":"simple","type":"int","optional":true,"format":257}}]},
    {"name":"OwnershipAssigned","header":85167505,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"prevOwner","type":{"kind":"simple","type":"address","optional":false}},{"name":"forwardPayload","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"NftTransfer","header":1607220500,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"newOwner","type":{"kind":"simple","type":"address","optional":false}},{"name":"responseDestination","type":{"kind":"simple","type":"address","optional":true}},{"name":"customPayload","type":{"kind":"simple","type":"cell","optional":true}},{"name":"forwardAmount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"forwardPayload","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"DeployEscrow","header":2953982992,"fields":[{"name":"nft","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"LoanRequest","header":2953982993,"fields":[{"name":"nft","type":{"kind":"simple","type":"address","optional":false}},{"name":"borrower","type":{"kind":"simple","type":"address","optional":false}},{"name":"principal","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"term","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"exp","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"sig","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"LoanApproved","header":2953982994,"fields":[{"name":"repay","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"principal","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"dueAt","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"treasury","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"LoanRejected","header":2953982995,"fields":[]},
    {"name":"RescueNft","header":2953982996,"fields":[{"name":"nft","type":{"kind":"simple","type":"address","optional":false}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"Rescue","header":2953982997,"fields":[{"name":"to","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"Repay","header":2953982978,"fields":[]},
    {"name":"Liquidate","header":2953982979,"fields":[]},
    {"name":"Withdraw","header":2953982980,"fields":[{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"SetMaxLoan","header":2953982981,"fields":[{"name":"value","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"GiftLoanPool$Data","header":null,"fields":[{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"treasury","type":{"kind":"simple","type":"address","optional":false}},{"name":"signerKey","type":{"kind":"simple","type":"uint","optional":false,"format":256}},{"name":"maxLoan","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"LoanEscrow$Data","header":null,"fields":[{"name":"pool","type":{"kind":"simple","type":"address","optional":false}},{"name":"nft","type":{"kind":"simple","type":"address","optional":false}},{"name":"status","type":{"kind":"simple","type":"uint","optional":false,"format":8}},{"name":"borrower","type":{"kind":"simple","type":"address","optional":true}},{"name":"owner","type":{"kind":"simple","type":"address","optional":true}},{"name":"treasury","type":{"kind":"simple","type":"address","optional":true}},{"name":"principal","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"repay","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"dueAt","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
]

const LoanEscrow_opcodes = {
    "OwnershipAssigned": 85167505,
    "NftTransfer": 1607220500,
    "DeployEscrow": 2953982992,
    "LoanRequest": 2953982993,
    "LoanApproved": 2953982994,
    "LoanRejected": 2953982995,
    "RescueNft": 2953982996,
    "Rescue": 2953982997,
    "Repay": 2953982978,
    "Liquidate": 2953982979,
    "Withdraw": 2953982980,
    "SetMaxLoan": 2953982981,
}

const LoanEscrow_getters: ABIGetter[] = [
    {"name":"status","methodId":101642,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"repayAmount","methodId":123839,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"dueAt","methodId":73375,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"borrowerAddress","methodId":116859,"arguments":[],"returnType":{"kind":"simple","type":"address","optional":true}},
]

export const LoanEscrow_getterMapping: { [key: string]: string } = {
    'status': 'getStatus',
    'repayAmount': 'getRepayAmount',
    'dueAt': 'getDueAt',
    'borrowerAddress': 'getBorrowerAddress',
}

const LoanEscrow_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"empty"}},
    {"receiver":"internal","message":{"kind":"typed","type":"OwnershipAssigned"}},
    {"receiver":"internal","message":{"kind":"typed","type":"LoanApproved"}},
    {"receiver":"internal","message":{"kind":"typed","type":"LoanRejected"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Repay"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Liquidate"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Rescue"}},
]

export const MIN_RESERVE = 500000000n;
export const GAS = 150000000n;
export const DEPLOY_MIN = 150000000n;
export const ESCROW_FUND = 80000000n;
export const ESCROW_KEEP = 20000000n;
export const REQUEST_VALUE = 120000000n;
export const APPROVE_VALUE = 50000000n;

export class LoanEscrow implements Contract {
    
    public static readonly storageReserve = 0n;
    public static readonly errors = LoanEscrow_errors_backward;
    public static readonly opcodes = LoanEscrow_opcodes;
    
    static async init(pool: Address, nft: Address) {
        return await LoanEscrow_init(pool, nft);
    }
    
    static async fromInit(pool: Address, nft: Address) {
        const __gen_init = await LoanEscrow_init(pool, nft);
        const address = contractAddress(0, __gen_init);
        return new LoanEscrow(address, __gen_init);
    }
    
    static fromAddress(address: Address) {
        return new LoanEscrow(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  LoanEscrow_types,
        getters: LoanEscrow_getters,
        receivers: LoanEscrow_receivers,
        errors: LoanEscrow_errors,
    };
    
    constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: null | OwnershipAssigned | LoanApproved | LoanRejected | Repay | Liquidate | Rescue) {
        
        let body: Cell | null = null;
        if (message === null) {
            body = new Cell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'OwnershipAssigned') {
            body = beginCell().store(storeOwnershipAssigned(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'LoanApproved') {
            body = beginCell().store(storeLoanApproved(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'LoanRejected') {
            body = beginCell().store(storeLoanRejected(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Repay') {
            body = beginCell().store(storeRepay(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Liquidate') {
            body = beginCell().store(storeLiquidate(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Rescue') {
            body = beginCell().store(storeRescue(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getStatus(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('status', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getRepayAmount(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('repayAmount', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getDueAt(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('dueAt', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getBorrowerAddress(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('borrowerAddress', builder.build())).stack;
        const result = source.readAddressOpt();
        return result;
    }
    
}