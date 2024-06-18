import {
    OfferCancelled as OfferCancelledEvent,
    OfferCreated as OfferCreatedEvent,
    OfferTaken as OfferTakenEvent,
    InitiateTradeCall as InitiateTradeCall,
} from '../generated/TrustlessOTC/TrustlessOTC';
import {
    OfferCancelled,
    OfferCreated,
    OfferTaken,
    OfferStats,
    TradeOffer,
    Token,
} from '../generated/schema';
import { BigInt, Bytes, BigDecimal } from '@graphprotocol/graph-ts';
import {
    fetchOfferDetails,
    fetchTokenDecimals,
    fetchTokenName,
    fetchTokenSymbol,
} from './helpers';

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

        tokenFrom.symbol = fetchTokenSymbol(call.inputs._tokenFrom);
        tokenFrom.name = fetchTokenName(call.inputs._tokenFrom);
        tokenFrom.decimals = fetchTokenDecimals(call.inputs._tokenFrom);
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
            tradeOffer.optionalTaker = call.inputs._optionalTaker;

            tradeOffer.save();
        }
    }
}

export function handleOfferCreated(event: OfferCreatedEvent): void {
    let offer = new OfferCreated(event.transaction.hash.toHexString());

    let tradeOffer = TradeOffer.load(event.params.tradeID.toString());
    if (tradeOffer == null) {
        tradeOffer = new TradeOffer(event.params.tradeID.toString());
        let offerDetails = fetchOfferDetails(
            event.address,
            event.params.tradeID,
        ).value;

        tradeOffer.tokenFrom = offerDetails.get_tokenFrom();
        tradeOffer.tokenTo = offerDetails.get_tokenTo();
        tradeOffer.amountFrom = offerDetails.get_amountFrom().toBigDecimal();
        tradeOffer.amountTo = offerDetails.get_amountTo().toBigDecimal();
        tradeOffer.amountFromWithFee = offerDetails
            .get_amountFrom()
            .minus(offerDetails.get_fee())
            .toBigDecimal();

        tradeOffer.feeAmount = offerDetails.get_fee();
        tradeOffer.creator = offerDetails.get_creator();
        tradeOffer.txFrom = event.transaction.from;
        tradeOffer.taker = ADDRESS_ZERO;
        tradeOffer.active = true;
        tradeOffer.completed = false;
        tradeOffer.tradeID = event.params.tradeID;
        tradeOffer.optionalTaker = ADDRESS_ZERO;
        tradeOffer.blockNumber = event.block.number;
        tradeOffer.creationTimestamp = event.block.timestamp;
        tradeOffer.creationHash = event.transaction.hash;

        tradeOffer.save();

        offer.tradeOffer = tradeOffer.id;
    }

    offer.creator = tradeOffer.creator;
    offer.tradeID = event.params.tradeID;
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
