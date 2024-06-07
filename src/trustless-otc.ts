import {
    OfferCancelled as OfferCancelledEvent,
    OfferCreated as OfferCreatedEvent,
    OfferTaken as OfferTakenEvent,
    InitiateTradeCall as InitiateTradeCall,
    TrustlessOTC,
} from '../generated/TrustlessOTC/TrustlessOTC';
import { ERC20 } from '../generated/TrustlessOTC/ERC20';
import {
    OfferCancelled,
    OfferCreated,
    OfferTaken,
    OfferStats,
    TradeOffer,
    Token,
} from '../generated/schema';
import {
    BigInt,
    Bytes,
    BigDecimal,
    ethereum,
    Address,
} from '@graphprotocol/graph-ts';
import { log } from '@graphprotocol/graph-ts';

export const ADDRESS_ZERO = Bytes.fromHexString(
    '0x0000000000000000000000000000000000000000',
);
export const ZERO_BI = BigInt.fromI32(0);
export const ONE_BI = BigInt.fromI32(1);
export const ZERO_BD = BigDecimal.fromString('0');

export function handleInitiateTrade(call: InitiateTradeCall): void {
    // Added tokens
    // create the tokens
    let tokenFrom = Token.load(call.inputs._tokenFrom);
    let tokenTo = Token.load(call.inputs._tokenTo);

    // fetch info if null
    if (tokenFrom === null) {
        tokenFrom = new Token(call.inputs._tokenFrom);

        let tokenFromContract = ERC20.bind(call.inputs._tokenFrom);
        tokenFrom.symbol = tokenFromContract.symbol();
        tokenFrom.name = tokenFromContract.name();
        let decimals = tokenFromContract.decimals();
        tokenFrom.decimals = BigInt.fromI32(decimals);
        tokenFrom.save();
    }

    if (tokenTo === null) {
        tokenTo = new Token(call.inputs._tokenTo);

        tokenTo.symbol = fetchTokenSymbol(call.inputs._tokenTo);
        tokenTo.name = fetchTokenName(call.inputs._tokenTo);
        tokenTo.decimals = fetchTokenDecimals(call.inputs._tokenTo);
        tokenTo.save();
    }

    let offer = OfferCreated.load(call.transaction.hash.toHexString());
    if (offer) {
        let tradeOffer = TradeOffer.load(offer.tradeID.toString());
        if (tradeOffer) {
            tradeOffer.tokenFrom = tokenFrom.id;
            tradeOffer.tokenTo = tokenTo.id;
            tradeOffer.amountFrom = call.inputs._amountFrom.toBigDecimal();
            tradeOffer.amountTo = call.inputs._amountTo.toBigDecimal();
            tradeOffer.creator = call.transaction.from;
            tradeOffer.optionalTaker = call.inputs._optionalTaker;
            tradeOffer.active = true;
            tradeOffer.tradeID = offer.tradeID;

            tradeOffer.save();
        }

        // Calculate amountFrom with fee
        let feeResult: ethereum.CallResult<BigInt> = new ethereum.CallResult();
        if (call.transaction.to !== null) {
            let contractInstance = TrustlessOTC.bind(
                call.transaction.to as Address,
            );
            feeResult = contractInstance.try_feeBasisPoints();
        }

        if (!feeResult.reverted && tradeOffer) {
            let feeAmount = call.inputs._amountFrom
                .toBigDecimal()
                .times(feeResult.value.toBigDecimal())
                .div(BigDecimal.fromString('10000'));
            tradeOffer.amountFromWithFee = call.inputs._amountFrom
                .toBigDecimal()
                .minus(feeAmount);
            tradeOffer.save();
        }
    }
}

export function fetchTokenSymbol(tokenAddress: Address): string {
    let contract = ERC20.bind(tokenAddress);

    let symbolValue = 'UNKNOWN';
    let symbolResult = contract.try_symbol();
    if (symbolResult.reverted) {
        log.warning('Failed to fetch symbol for contract at address: {}', [
            tokenAddress.toHex(),
        ]);
    } else {
        symbolValue = symbolResult.value;
    }
    return symbolValue;
}

export function fetchTokenName(tokenAddress: Address): string {
    let contract = ERC20.bind(tokenAddress);

    let name = 'UNKNOWN';
    let nameResult = contract.try_symbol();
    if (nameResult.reverted) {
        log.warning('Failed to fetch name for contract at address: {}', [
            tokenAddress.toHex(),
        ]);
    } else {
        name = nameResult.value;
    }

    return name;
}

export function fetchTokenDecimals(tokenAddress: Address): BigInt {
    let contract = ERC20.bind(tokenAddress);

    let decimalValue = BigInt.fromString('0');
    let decimalResult = contract.try_decimals();
    if (!decimalResult.reverted) {
        decimalValue = BigInt.fromI32(decimalResult.value);
    }

    return decimalValue;
}

export function handleOfferCreated(event: OfferCreatedEvent): void {
    let offer = new OfferCreated(event.transaction.hash.toHexString());

    let tradeOffer = TradeOffer.load(event.params.tradeID.toString());
    if (tradeOffer == null) {
        tradeOffer = new TradeOffer(event.params.tradeID.toString());
        tradeOffer.amountFrom = ZERO_BD;
        tradeOffer.amountFromWithFee = ZERO_BD;
        tradeOffer.amountTo = ZERO_BD;
        tradeOffer.creator = ADDRESS_ZERO;
        tradeOffer.taker = ADDRESS_ZERO;
        tradeOffer.optionalTaker = ADDRESS_ZERO;
        tradeOffer.active = false;
        tradeOffer.completed = false;
        tradeOffer.tradeID = ZERO_BI;
        tradeOffer.blockNumber = event.block.number;
        tradeOffer.creationTimestamp = event.block.timestamp;
        tradeOffer.creationHash = event.transaction.hash;
        tradeOffer.save();

        offer.tradeOffer = tradeOffer.id;
    }

    offer.tradeID = event.params.tradeID;
    offer.creator = event.transaction.from;
    offer.blockNumber = event.block.number;
    offer.blockTimestamp = event.block.timestamp;
    offer.transactionHash = event.transaction.hash;
    offer.save();

    let stats = OfferStats.load(event.transaction.from);
    if (!stats) {
        stats = new OfferStats(event.transaction.from);
        stats.accepted = ZERO_BI;
        stats.canceled = ZERO_BI;
        stats.total = ZERO_BI;
        stats.lastUpdateTimestamp = ZERO_BI;
    }

    stats.total = stats.total.plus(ONE_BI);
    stats.lastUpdateTimestamp = event.block.timestamp;
    stats.save();
}

export function handleOfferCancelled(event: OfferCancelledEvent): void {
    let tradeOffer = TradeOffer.load(event.params.tradeID.toString());
    if (tradeOffer) {
        tradeOffer.active = false;
        tradeOffer.cancelTimestamp = event.block.timestamp;
        tradeOffer.cancelHash = event.transaction.hash;
        tradeOffer.save();
    }

    if (tradeOffer) {
        let offer = new OfferCancelled(tradeOffer.tradeID.toString());
        offer.tradeID = event.params.tradeID;
        offer.tradeOffer = tradeOffer.id;
        offer.creator = event.transaction.from;
        offer.blockNumber = event.block.number;
        offer.blockTimestamp = event.block.timestamp;
        offer.transactionHash = event.transaction.hash;
        offer.save();

        let stats = OfferStats.load(tradeOffer.creator);
        if (stats) {
            stats.canceled = stats.canceled.plus(ONE_BI);
            stats.lastUpdateTimestamp = event.block.timestamp;
            stats.save();
        }
    }
}

export function handleOfferTaken(event: OfferTakenEvent): void {
    let tradeOffer = TradeOffer.load(event.params.tradeID.toString());
    if (tradeOffer) {
        tradeOffer.active = false;
        tradeOffer.completed = true;
        tradeOffer.taker = event.transaction.from;
        tradeOffer.takenTimestamp = event.block.timestamp;
        tradeOffer.takenHash = event.transaction.hash;
        tradeOffer.save();
    }

    if (tradeOffer) {
        let offer = new OfferTaken(tradeOffer.tradeID.toString());
        offer.tradeID = event.params.tradeID;
        offer.tradeOffer = tradeOffer.id;
        offer.taker = event.transaction.from;
        offer.blockNumber = event.block.number;
        offer.blockTimestamp = event.block.timestamp;
        offer.transactionHash = event.transaction.hash;
        offer.save();

        let stats = OfferStats.load(tradeOffer.creator);
        if (stats) {
            stats.accepted = stats.accepted.plus(ONE_BI);
            stats.lastUpdateTimestamp = event.block.timestamp;
            stats.save();
        }
    }
}
