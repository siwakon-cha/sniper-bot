import ethers from 'ethers';
import express from 'express';
import chalk from 'chalk';
import Web3 from 'web3'
import * as fs from 'fs';

import ERC20 from './ERC20.json'

const app = express();
const { privatekey } = JSON.parse(fs.readFileSync(".secret").toString().trim());

const ONE_GWEI = 1e9;
const PANCAKE_ROUTER_V2 = '0x10ED43C718714eb63d5aA57B78B54704E256024E' // Mainnet
const PANCAKE_FACTORY_V2 = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73' // Mainnet
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' // Mainnet
const BUSD = '0xe9e7cea3dedca5984780bafc599bd69add087d56' // Mainnet

const data = {
  WBNB: BUSD,
  to_PURCHASE: '',  // token to purchase
  factory: PANCAKE_FACTORY_V2,
  router: PANCAKE_ROUTER_V2,
  recipient: '0x21e16179F0DA51319816aDf5D4bf05A145fC0d48', //wallet address,
  AMOUNT_OF_WBNB : '260',
  Slippage : '10', //in Percentage
  gasPrice : '1000', //in gwei
  gasLimit : '1200000' //at least 21000
}

app.get('/sniper/:tokenAddress', async (req, res) => {
  try {
    console.log(chalk.yellow(`-------- Start Service ---------`))
    let bscMainNetUrl = 'https://bsc-dataseed.binance.org/'
    // let bscTestnetUrl = 'https://data-seed-prebsc-1-s1.binance.org:8545'
    let web3 = new Web3(new Web3.providers.HttpProvider(bscMainNetUrl));
    let provider = new ethers.providers.JsonRpcProvider(bscMainNetUrl);
    let wallet = new ethers.Wallet(privatekey);
    const account = wallet.connect(provider);

    const router = new ethers.Contract(
      data.router,
      [
        'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
      ],
      account
    );

    const { tokenAddress } = req.params
    const tokenIn = data.WBNB;
    const tokenOut = tokenAddress || '';
    console.log('contract address = ', tokenAddress)
    data.to_PURCHASE = tokenAddress
    console.log(chalk.green(`Connected With Account = `, account))

    // const tokenAInput = new web3.eth.Contract(ERC20.abi,data.WBNB);
    // const tokenBPurchase = new web3.eth.Contract(ERC20.abi,data.to_PURCHASE);
    // const address = await account.getAddress()
    // const tokenAResult = await tokenAInput.methods.allowance(address,data.router).call();
    // const tokenBResult = await tokenBPurchase.methods.allowance(address,data.router).call();
    // console.log('tokenAResult',tokenAResult)
    // let allowanceTokenA = ethers.utils.formatEther(tokenAResult).toString()
    // let allowanceTokenB = ethers.utils.formatEther(tokenBResult).toString()
    //
    // const user_wallet = web3.eth.accounts.privateKeyToAccount(privatekey);
    // var max_allowance = '10000000000000000000000000';
    // console.log('allowanceTokenA',allowanceTokenA)
    // if(Number(allowanceTokenA) === 0.0){
    //   var approveTX ={
    //     from: user_wallet.address,
    //     to: data.to_PURCHASE,
    //     gas: data.gasLimit,
    //     gasPrice: 50*ONE_GWEI,
    //     data: tokenAInput.methods.approve(data.router, max_allowance).encodeABI()
    //   }
    //
    //   var signedTX = await user_wallet.signTransaction(approveTX);
    //   var result = await web3.eth.sendSignedTransaction(signedTX.rawTransaction);
    //   console.log('result',result)
    //   console.log('Approved Token A')
    // }
    // console.log('allowanceTokenB',allowanceTokenB)
    // if(Number(allowanceTokenB) === 0.0){
    //   var approveTX ={
    //     from: user_wallet.address,
    //     to: data.to_PURCHASE,
    //     gas: data.gasLimit,
    //     gasPrice: 50*ONE_GWEI,
    //     data: tokenBPurchase.methods.approve(data.router, max_allowance).encodeABI()
    //   }
    //
    //   var signedTX = await user_wallet.signTransaction(approveTX);
    //   var result = await web3.eth.sendSignedTransaction(signedTX.rawTransaction);
    //   console.log('result',result)
    //   console.log('Approved Token B')
    // }

    const amountInChecked = ethers.utils.parseUnits('1', 'ether');
    const resultAmount = await router.getAmountsOut(amountInChecked, [tokenIn, tokenOut]);
    const amountChecked = ethers.utils.formatEther(resultAmount[1].toString())

    console.log(chalk.yellow(`Token Received = ` + amountChecked))
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

    console.log('amount purchase = ', ethers.utils.formatEther(amountOutMin.toString()))

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

    res.json('success')
  } catch (err){
    res.json(err)
  }
})

const PORT = 5000;

async function checkPair(){
  let bscMainNetUrl = 'https://bsc-dataseed.binance.org/'
  // let bscTestnetUrl = 'https://data-seed-prebsc-1-s1.binance.org:8545'
  let web3 = new Web3(new Web3.providers.HttpProvider(bscMainNetUrl));
  let provider = new ethers.providers.JsonRpcProvider(bscMainNetUrl);
  let wallet = new ethers.Wallet(privatekey);
  const account = wallet.connect(provider);

  const factory = new ethers.Contract(
    data.factory,
    ['function getPair(address tokenA, address tokenB) external view returns (address pair)'],
    account
  );

  const intervalId = setInterval(async () => {
    const pairAddress = await factory.getPair('0x5Cb2C3Ed882E37DA610f9eF5b0FA25514d7bc85B', '0xe9e7cea3dedca5984780bafc599bd69add087d56');
    console.log('pairAddress',pairAddress)
  }, 3000)

  // clearInterval(intervalId)
  // const pair = await new ethers.Contract(pairAddress, ['event Mint(address indexed sender, uint amount0, uint amount1)'], account);
}

checkPair()

app.listen(PORT, (console.log(chalk.yellow(`Listening for Liquidity Addition to token ${data.to_PURCHASE}`))));
