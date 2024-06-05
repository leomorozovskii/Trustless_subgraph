import {
    OfferCancelled as OfferCancelledEvent,
    OfferCreated as OfferCreatedEvent,
    OfferTaken as OfferTakenEvent,
} from '../generated/TrustlessOTC/TrustlessOTC';
import { OfferCancelled, OfferCreated, OfferTaken } from '../generated/schema';

export function handleOfferCancelled(event: OfferCancelledEvent): void {
    let entity = new OfferCancelled(
        event.transaction.hash.concatI32(event.logIndex.toI32()),
    );
    entity.tradeID = event.params.tradeID;

    entity.blockNumber = event.block.number;
    entity.blockTimestamp = event.block.timestamp;
    entity.transactionHash = event.transaction.hash;

    entity.save();
}

export function handleOfferCreated(event: OfferCreatedEvent): void {
    let entity = new OfferCreated(
        event.transaction.hash.concatI32(event.logIndex.toI32()),
    );
    entity.tradeID = event.params.tradeID;

    entity.blockNumber = event.block.number;
    entity.blockTimestamp = event.block.timestamp;
    entity.transactionHash = event.transaction.hash;

    entity.save();
}

export function handleOfferTaken(event: OfferTakenEvent): void {
    let entity = new OfferTaken(
        event.transaction.hash.concatI32(event.logIndex.toI32()),
    );
    entity.tradeID = event.params.tradeID;

    entity.blockNumber = event.block.number;
    entity.blockTimestamp = event.block.timestamp;
    entity.transactionHash = event.transaction.hash;

    entity.save();
}
