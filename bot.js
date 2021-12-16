import ethers from 'ethers';
import express from 'express';
import chalk from 'chalk';
import Web3 from 'web3'
import * as fs from 'fs';
import BigNumber from 'big-number';

const ERC20 = [
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_spender",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_from",
        "type": "address"
      },
      {
        "name": "_to",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "name": "",
        "type": "uint8"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "name": "balance",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_to",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      },
      {
        "name": "_spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "payable": true,
    "stateMutability": "payable",
    "type": "fallback"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "spender",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  }
]

const app = express();

const { privatekey } = JSON.parse(fs.readFileSync(".secret").toString().trim());
// one gwei
const ONE_GWEI = 1e9;
const bscTestnetUrl = 'https://data-seed-prebsc-1-s1.binance.org:8545'
let web3 = new Web3(new Web3.providers.HttpProvider(bscTestnetUrl));
const data = {
  WBNB: '0xC9a51cC8C2Ec9bCBFDCce2F3938A13Cc2E4EBfa8', //wbnb
  to_PURCHASE: '0xA73e995F9a51B0C91BAD64fe775FdAC5FcAa272D',  // token to purchase = BUSD for test
  factory: '0x4fcEd72290D3337b20F214b2De6dd4974bB75Af2',  //PancakeSwap V2 factory
  router: '0xcd147E2C00f7262067145CF196d39545aed4015E', //PancakeSwap V2 router
  recipient: '0x7Fe1f50050934C11FC7ffaF4AcdB6BAf27daBF45', //wallet address,
  AMOUNT_OF_WBNB : '100',
  Slippage : '3', //in Percentage
  gasPrice : '10', //in gwei
  gasLimit : '200000' //at least 21000
}

let initialLiquidityDetected = false;
console.log('privatekey',privatekey)
// Connect a wallet to mainnet
let provider = new ethers.providers.JsonRpcProvider(bscTestnetUrl);
// let walletWithProvider = new ethers.Wallet(privatekey);
let wallet = new ethers.Wallet(privatekey);
const signer = await provider.getSigner()
const bscMainnetUrl = 'https://bsc-dataseed.binance.org/'
const mnemonic = '';
// const wallet = ethers.Wallet.fromMnemonic(mnemonic);
const account = wallet.connect(provider);

const factory = new ethers.Contract(
  data.factory,
  ['function getPair(address tokenA, address tokenB) external view returns (address pair)'],
  account
);

const router = new ethers.Contract(
  data.router,
  [
    'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
  ],
  account
);

async function sniper(){
  const tokenIn = data.WBNB;
  const tokenOut = data.to_PURCHASE;
  const pairAddress = await factory.getPair(tokenIn, tokenOut);

  const tokenAInput = new web3.eth.Contract(ERC20,data.WBNB);
  const tokenBPurchase = new web3.eth.Contract(ERC20,data.to_PURCHASE);
  const address = await account.getAddress()
  const tokenAResult = await tokenAInput.methods.allowance(address,data.router).call();
  const tokenBResult = await tokenBPurchase.methods.allowance(address,data.router).call();

  let allowanceTokenA = ethers.utils.formatEther(tokenAResult).toString()
  let allowanceTokenB = ethers.utils.formatEther(tokenBResult).toString()

  const user_wallet = web3.eth.accounts.privateKeyToAccount(privatekey);
  var max_allowance = '10000000000000000000000000';
  console.log('allowanceTokenA',allowanceTokenA)
  if(Number(allowanceTokenA) === 0.0){
    var approveTX ={
      from: user_wallet.address,
      to: data.to_PURCHASE,
      gas: data.gasLimit,
      gasPrice: 50*ONE_GWEI,
      data: tokenAInput.methods.approve(data.router, max_allowance).encodeABI()
    }

    var signedTX = await user_wallet.signTransaction(approveTX);
    var result = await web3.eth.sendSignedTransaction(signedTX.rawTransaction);
    console.log('result',result)
    console.log('Approved Token A')
  }
  console.log('allowanceTokenB',allowanceTokenB)
  if(Number(allowanceTokenB) === 0.0){
    var approveTX ={
      from: user_wallet.address,
      to: data.to_PURCHASE,
      gas: data.gasLimit,
      gasPrice: 50*ONE_GWEI,
      data: tokenBPurchase.methods.approve(data.router, max_allowance).encodeABI()
    }

    var signedTX = await user_wallet.signTransaction(approveTX);
    var result = await web3.eth.sendSignedTransaction(signedTX.rawTransaction);
    console.log('result',result)
    console.log('Approved Token B')
  }

  const pair = await new ethers.Contract(pairAddress, ['event Mint(address indexed sender, uint amount0, uint amount1)'], account);

  pair.on('Mint', async (sender, amount0, amount1) => {
    // if(initialLiquidityDetected === true) {
    //   return;
    // }
    //
    // initialLiquidityDetected = true;

    //We buy x amount of the new token for our wbnb
    const amountIn = ethers.utils.parseUnits(`${data.AMOUNT_OF_WBNB}`, 'ether');
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);

    //Our execution price will be a bit different, we need some flexbility
    const amountOutMin = amounts[1].sub(amounts[1].div(`${data.Slippage}`));

    console.log(
      chalk.green.inverse(`Liquidity Addition Detected\n`)
      +
      `Buying Token
     =================
     tokenIn: ${amountIn.toString()} ${tokenIn} (WBNB)
     tokenOut: ${amountOutMin.toString()} ${tokenOut}
   `);

    console.log('Processing Transaction.....');
    console.log(chalk.yellow(`amountIn: ${amountIn}`));
    console.log(chalk.yellow(`amountOutMin: ${amountOutMin}`));
    console.log(chalk.yellow(`tokenIn: ${tokenIn}`));
    console.log(chalk.yellow(`tokenOut: ${tokenOut}`));
    console.log(chalk.yellow(`data.recipient: ${data.recipient}`));
    console.log(chalk.yellow(`data.gasLimit: ${data.gasLimit}`));
    console.log(chalk.yellow(`data.gasPrice: ${ethers.utils.parseUnits(`${data.gasPrice}`, 'gwei')}`));

    const tx = await router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      [tokenIn, tokenOut],
      data.recipient,
      Date.now() + 1000 * 60 * 10, //10 minutes
      {
        'gasLimit': data.gasLimit,
        'gasPrice': ethers.utils.parseUnits(`${data.gasPrice}`, 'gwei')
      });

    const receipt = await tx.wait();
    console.log('Transaction receipt');
    console.log(receipt);
  });
}

const run = async () => {
  await sniper()
}

run();

const PORT = 5000;

app.listen(PORT, (console.log(chalk.yellow(`Listening for Liquidity Addition to token ${data.to_PURCHASE}`))));
