const { assert, expect } = require("chai")
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", function () {
          let raffle, raffleEntranceFee, deployer

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
          })

          describe("fulfillRandomWords", function () {
              it("works live with Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                  const startingTimeStamp = await raffle.getLastTimeStamp()
                  const accounts = await ethers.getSigners()

                  // setup the listener before we enter the raffle (in case the blockchains is moving fast)
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired")

                          try {
                              setTimeout(async () => {
                                  // add our asserts
                                  const recentWinner = await raffle.getRecentWinner()
                                  const raffleState = await raffle.getRaffleState()
                                  const winnerEndingBalance = await accounts[0].getBalance()
                                  const endingTimeStamp = await raffle.getLastTimeStamp()

                                  console.log("1")

                                  await expect(raffle.getPlayer(0)).to.be.reverted
                                  assert.equal(recentWinner.toString(), accounts[0].address)
                                  assert.equal(raffleState, 0)
                                  assert.equal(
                                      winnerEndingBalance.toString(),
                                      winnerStartingBalance.add(raffleEntranceFee).toString()
                                  )
                                  assert(endingTimeStamp > startingTimeStamp)
                                  console.log("2")
                                  resolve()
                              }, 15000)
                          } catch (error) {
                              console.log(error)
                              reject(e)
                          }
                      })

                      // enter the raffle
                      console.log("3")
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                      await tx.wait(6)
                      console.log("4")
                      const winnerStartingBalance = await accounts[0].getBalance()
                      console.log("winnerStartingBalance: ", winnerStartingBalance.toString())
                      // and this code wont end until our listener hs finished listening
                  })
              })
          })
      })
