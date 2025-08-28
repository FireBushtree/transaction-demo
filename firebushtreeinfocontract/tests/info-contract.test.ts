import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address } from "@graphprotocol/graph-ts"
import { MessageChanged } from "../generated/schema"
import { MessageChanged as MessageChangedEvent } from "../generated/InfoContract/InfoContract"
import { handleMessageChanged } from "../src/info-contract"
import { createMessageChangedEvent } from "./info-contract-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let sender = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let oldMessage = "Example string value"
    let newMessage = "Example string value"
    let newMessageChangedEvent = createMessageChangedEvent(
      sender,
      oldMessage,
      newMessage
    )
    handleMessageChanged(newMessageChangedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("MessageChanged created and stored", () => {
    assert.entityCount("MessageChanged", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "MessageChanged",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "sender",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "MessageChanged",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "oldMessage",
      "Example string value"
    )
    assert.fieldEquals(
      "MessageChanged",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "newMessage",
      "Example string value"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
