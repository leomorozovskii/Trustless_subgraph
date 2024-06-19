# TrustlessOTC subgraph

A subgraph is a protocol for indexing and querying historical data from the blockchain. This subgraph allows you to query data that is difficult to retrieve directly from the contract. This particular subgraph is designed for indexing and processing data from the TrustlessOTC smart contract.

By using this subgraph, developers can quickly retrieve and analyze trade offers without directly interacting with the blockchain, making data access faster and more efficient.

## Installation and Prerequisites

Before you can deploy the subgraph, ensure that you have the following prerequisites:

- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git). You'll know you've done it right if you can run `git --version`
- Node.js and npm/yarn installed
- The Graph CLI installed

Installing The Graph CLI:

```bash
$ npm install -g @graphprotocol/graph-cli
```

Clone the repository:

```bash
$ git clone <REPOSITORY_URL>
```

## Settings and deploy

1. Installing dependencies

For example, if you're using yarn:
```
$ yarn install
```

2. In the [subgraph.yaml](./subgraph.yaml) file, specify the following:

- **network** - the network where the smart contract will be indexed;
- **address** - the target smart contract address;
- **startBlock** - the block from which indexing should start, such as the deployment block of the target smart contract.

For example:
```yaml
dataSources:
  - kind: ethereum
    name: TrustlessOTC
    network: sepolia
    source:
      address: "0xE13aC924bB0B0260b7d7f2710c0224161b9f10Ed"
      abi: TrustlessOTC
      startBlock: 5987757
```

3. Run the command to build the subgraph:

```bash
$ graph codegen && graph build
```

4. Deploy the subgraph to the chosen service; the deployment process may slightly vary depending on the service. For some services, you may need to authenticate first, while others may require you to provide an API key during the deployment process.

```bash
$ graph deploy <YOUR_SERVICE_DEPLOY_COMMAND>
```

For example:

```bash
$ graph auth --studio <YOUR_ACCESS_TOKEN>

$ graph deploy --studio <SUBGRAPH_NAME> --version-label <VERSION_LABEL>
```

After completing these steps, the service will provide a link for performing GraphQL queries.

## Main Entities

The entities are described in the [schema.graphql](./schema.graphql) file. The primary entities are TradeOffer and Token.

### TradeOffer

TradeOffer collects all the necessary information about an offer throughout its lifecycle, from creation to acceptance or cancellation. The identifier is `tradeID`:

```js
type TradeOffer @entity {
    id: String!
    tokenFrom: Token
    tokenTo: Token
    amountFrom: BigDecimal!
    amountFromWithFee: BigDecimal!
    amountTo: BigDecimal!
    txFrom: Bytes!
    creator: Bytes!
    taker: Bytes!
    optionalTaker: Bytes
    active: Boolean!
    completed: Boolean!
    tradeID: BigInt!
    feeAmount: BigInt!
    blockNumber: BigInt!
    creationTimestamp: BigInt!
    cancelTimestamp: BigInt
    takenTimestamp: BigInt
    creationHash: Bytes!
    cancelHash: Bytes
    takenHash: Bytes
}
```

### Token

The Token entity is part of TradeOffer and stores the primary information about the tokens used in the offer. The identifier is the token address:

```js
type Token @entity {
    id: Bytes!
    symbol: String
    name: String!
    decimals: BigInt!
}
```
