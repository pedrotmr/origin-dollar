import React, { useState, useEffect } from 'react'
import { fbt } from 'fbt-runtime'
import { useWeb3React } from '@web3-react/core'
import { useStoreState } from 'pullstate'
import { ethers } from 'ethers'
import { get } from 'lodash'

import AccountStore from 'stores/AccountStore'
import withRpcProvider from 'hoc/withRpcProvider'
import ContractStore from 'stores/ContractStore'
import analytics from 'utils/analytics'
import { connectorNameIconMap, getConnectorIcon } from 'utils/connectors'
import { assetRootPath } from 'utils/image'

const ApproveCurrencyRow = ({
  coin,
  contractToApprove,
  isLast,
  swapMetadata,
  storeTransaction,
  storeTransactionError,
  rpcProvider,
  onApproved,
  isApproved,
  onMintingError,
}) => {
  //approve, waiting-user, waiting-network, done
  const [stage, setStage] = useState(isApproved ? 'done' : 'approve')
  const [contract, setContract] = useState(null)
  const connectorName = useStoreState(AccountStore, (s) => s.connectorName)
  const connectorIcon = getConnectorIcon(connectorName)
  const web3react = useWeb3React()
  const { library, account } = web3react

  const {
    vault,
    flipper,
    uniV3SwapRouter,
    uniV2Router,
    sushiRouter,
    curveOUSDMetaPool,
    usdt,
    dai,
    usdc,
    ousd,
  } = useStoreState(ContractStore, (s) => s.contracts || {})

  const contractMap = {
    vault: vault,
    flipper: flipper,
    uniswap: uniV3SwapRouter,
    curve: curveOUSDMetaPool,
    uniswapV2: uniV2Router,
    sushiswap: sushiRouter,
  }

  useEffect(() => {
    if (coin === 'dai') {
      setContract(dai)
    } else if (coin === 'usdt') {
      setContract(usdt)
    } else if (coin === 'usdc') {
      setContract(usdc)
    } else if (coin === 'ousd') {
      setContract(ousd)
    }
  }, [])

  return (
    <>
      <div
        className={`currency-row d-flex align-items-center ${
          isLast ? 'last' : ''
        }`}
      >
        <img
          className="icon"
          src={assetRootPath(`/images/currency/${coin}-icon-small.svg`)}
        />
        {stage === 'approve' && (
          <>
            {fbt(
              'Permission to use ' + fbt.param('coin-name', coin.toUpperCase()),
              'permission to use coin'
            )}
            <a
              className="blue-btn d-flex align-items-center justify-content-center"
              onClick={async () => {
                analytics.track('On Approve Coin', {
                  category: 'swap',
                  label: swapMetadata.coinGiven,
                  value: parseInt(swapMetadata.swapAmount),
                })
                setStage('waiting-user')
                try {
                  const maximum = ethers.constants.MaxUint256
                  const result = await contract
                    .connect(library.getSigner(account))
                    .approve(contractMap[contractToApprove].address, maximum)
                  storeTransaction(result, 'approve', coin)
                  setStage('waiting-network')

                  const receipt = await rpcProvider.waitForTransaction(
                    result.hash
                  )
                  analytics.track('Approval Successful', {
                    category: 'swap',
                    label: swapMetadata.coinGiven,
                    value: parseInt(swapMetadata.swapAmount),
                  })
                  if (onApproved) {
                    onApproved()
                  }
                  setStage('done')
                } catch (e) {
                  onMintingError(e)
                  console.error('Exception happened: ', e)
                  setStage('approve')

                  if (e.code !== 4001) {
                    await storeTransactionError('approve', coin)
                    analytics.track(`Approval failed`, {
                      category: 'swap',
                      label: e.message,
                    })
                  } else {
                    analytics.track(`Approval canceled`, {
                      category: 'swap',
                    })
                  }
                }
              }}
            >
              {fbt('Approve', 'Approve')}
            </a>
          </>
        )}
        {stage === 'waiting-user' && (
          <>
            {fbt(
              'Waiting for you to confirm...',
              'Waiting for you to confirm...'
            )}
            <img
              className="waiting-icon ml-auto"
              src={assetRootPath(`/images/${connectorIcon}`)}
            />
          </>
        )}
        {stage === 'waiting-network' && (
          <>
            {fbt(
              'Approving ' + fbt.param('coin-name', coin.toUpperCase() + '...'),
              'approving coin'
            )}
            <img
              className="waiting-icon rotating ml-auto"
              src={assetRootPath('/images/spinner-green-small.png')}
            />
          </>
        )}
        {stage === 'done' && (
          <>
            {fbt(
              fbt.param('coin-name', coin.toUpperCase() + ' approved'),
              'Coin approved'
            )}
            <img
              className="waiting-icon ml-auto"
              src={assetRootPath('/images/green-check.svg')}
            />
          </>
        )}
      </div>
      <style jsx>{`
        .currency-row {
          padding-top: 13px;
          padding-bottom: 13px;
          border-bottom: 1px solid #dde5ec;
        }

        .currency-row.last {
          border-bottom: 0px;
        }

        .icon {
          margin-right: 10px;
          width: 30px;
          height: 30px;
        }

        .waiting-icon {
          width: 30px;
          height: 30px;
        }

        .blue-btn {
          margin-left: auto;
          height: 35px;
          border-radius: 25px;
          background-color: #1a82ff;
          padding-left: 19px;
          padding-right: 19px;
          color: white;
          cursor: pointer;
        }

        .blue-btn:hover {
          background-color: #0a72ef;
          text-decoration: none;
        }

        .rotating {
          -webkit-animation: spin 2s linear infinite;
          -moz-animation: spin 2s linear infinite;
          animation: spin 2s linear infinite;
        }

        @-moz-keyframes spin {
          100% {
            -moz-transform: rotate(360deg);
          }
        }
        @-webkit-keyframes spin {
          100% {
            -webkit-transform: rotate(360deg);
          }
        }
        @keyframes spin {
          100% {
            -webkit-transform: rotate(360deg);
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  )
}

export default withRpcProvider(ApproveCurrencyRow)
