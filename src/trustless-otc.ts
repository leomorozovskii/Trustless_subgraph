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
    TradeOffer,
} from '../generated/schema';
import { BigInt, Bytes } from '@graphprotocol/graph-ts';

export const ADDRESS_ZERO = Bytes.fromHexString(
    '0x0000000000000000000000000000000000000000',
);
export let ZERO_BI = BigInt.fromI32(0);

export function handleInitiateTrade(call: InitiateTradeCall): void {
    let offer = OfferCreated.load(call.transaction.hash.toHexString());
    if (offer) {
        let tradeOffer = TradeOffer.load(offer.tradeID.toString());
        if (tradeOffer) {
            tradeOffer.tokenFrom = call.inputs._tokenFrom;
            tradeOffer.tokenTo = call.inputs._tokenTo;
            tradeOffer.amountFrom = call.inputs._amountFrom;
            tradeOffer.amountTo = call.inputs._amountTo;
            tradeOffer.creator = call.transaction.from;
            tradeOffer.optionalTaker = call.inputs._optionalTaker;
            tradeOffer.active = true;
            tradeOffer.tradeID = offer.tradeID;

            tradeOffer.save();
        }
    }
}

export function handleOfferCreated(event: OfferCreatedEvent): void {
    let offer = new OfferCreated(event.transaction.hash.toHexString());

    let tradeOffer = TradeOffer.load(event.params.tradeID.toString());
    if (tradeOffer == null) {
        tradeOffer = new TradeOffer(event.params.tradeID.toString());
        tradeOffer.tokenFrom = ADDRESS_ZERO;
        tradeOffer.tokenTo = ADDRESS_ZERO;
        tradeOffer.amountFrom = ZERO_BI;
        tradeOffer.amountTo = ZERO_BI;
        tradeOffer.creator = ADDRESS_ZERO;
        tradeOffer.taker = ADDRESS_ZERO;
        tradeOffer.optionalTaker = ADDRESS_ZERO;
        tradeOffer.active = false;
        tradeOffer.completed = false;
        tradeOffer.tradeID = ZERO_BI;
        tradeOffer.blockNumber = event.block.number;
        tradeOffer.blockTimestamp = event.block.timestamp;
        tradeOffer.transactionHash = event.transaction.hash;
        tradeOffer.save();

        offer.tradeOffer = tradeOffer.id;
    }

    offer.tradeID = event.params.tradeID;
    offer.creator = event.transaction.from;
    offer.blockNumber = event.block.number;
    offer.blockTimestamp = event.block.timestamp;
    offer.transactionHash = event.transaction.hash;
    offer.save();
}

export function handleOfferCancelled(event: OfferCancelledEvent): void {
    let tradeOffer = TradeOffer.load(event.params.tradeID.toString());
    if (tradeOffer) {
        tradeOffer.active = false;
        tradeOffer.save();
    }

    if (tradeOffer) {
        let offer = new OfferCancelled(tradeOffer.tradeID.toString());
        offer.tradeOffer = tradeOffer.id;
        offer.creator = event.transaction.from;
        offer.blockNumber = event.block.number;
        offer.blockTimestamp = event.block.timestamp;
        offer.transactionHash = event.transaction.hash;
        offer.save();
    }
}

export function handleOfferTaken(event: OfferTakenEvent): void {
    let tradeOffer = TradeOffer.load(event.params.tradeID.toString());
    if (tradeOffer) {
        tradeOffer.active = false;
        tradeOffer.completed = true;
        tradeOffer.taker = event.transaction.from;
        tradeOffer.save();
    }

    if (tradeOffer) {
        let offer = new OfferTaken(tradeOffer.tradeID.toString());
        offer.tradeOffer = tradeOffer.id;
        offer.taker = event.transaction.from;
        offer.blockNumber = event.block.number;
        offer.blockTimestamp = event.block.timestamp;
        offer.transactionHash = event.transaction.hash;
        offer.save();
    }
}
