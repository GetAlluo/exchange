import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, BigNumberish, constants } from "ethers";
import { formatEther, formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { Exchange, IERC20Metadata, IWrappedEther } from "../typechain";

async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );
    return await ethers.getSigner(address);
}

const zeroAddr = constants.AddressZero;
const nativeEth = zeroAddr;
let signers: SignerWithAddress[];
let exchange: Exchange;
let customAmounts: { [key: string]: BigNumber } = {};

async function testSwap(fromAddress: string, toAddress: string, amount: BigNumberish) {
    if (fromAddress == zeroAddr || fromAddress == nativeEth) {
        const to = await ethers.getContractAt("IERC20Metadata", toAddress);
        const balBefore = await to.balanceOf(signers[0].address);
        const tx = await (await exchange.exchange(nativeEth, to.address, amount, 0, { value: amount })).wait();
        console.log("Swapped", formatEther(amount),
            "ETH for", formatUnits((await to.balanceOf(signers[0].address)).sub(balBefore), await to.decimals()),
            await to.symbol() + ",", "gas used:", tx.cumulativeGasUsed.toString());
        return;
    }
    if (toAddress == zeroAddr || toAddress == nativeEth) {
        const from = await ethers.getContractAt("IERC20Metadata", fromAddress);
        await from.approve(exchange.address, amount);
        const balBefore = await signers[0].getBalance();
        const tx = await (await exchange.exchange(from.address, toAddress, amount, 0)).wait();
        console.log("Swapped", formatUnits(amount, await from.decimals()),
            await from.symbol(), "for", formatEther((await signers[0].getBalance()).sub(balBefore)),
            "ETH, gas used:", tx.cumulativeGasUsed.toString());
        return;
    }

    const from = await ethers.getContractAt("IERC20Metadata", fromAddress);
    await from.approve(exchange.address, amount);
    const to = await ethers.getContractAt("IERC20Metadata", toAddress);
    const balBefore = await to.balanceOf(signers[0].address);
    const tx = await (await exchange.exchange(fromAddress, toAddress, amount, 0)).wait();
    console.log("Swapped", formatUnits(amount, await from.decimals()),
        await from.symbol(), "for", formatUnits((await to.balanceOf(signers[0].address)).sub(balBefore), await to.decimals()),
        await to.symbol() + ",", "gas used:", tx.cumulativeGasUsed.toString());
}

async function main() {
    await network.provider.request({
        method: "hardhat_reset",
        params: [{
            forking: {
                enabled: true,
                jsonRpcUrl: process.env.OPTIMISM_URL as string,
            },
        },],
    });

    exchange = await ethers.getContractAt("Exchange", "0x66Ac11c106C3670988DEFDd24BC75dE786b91095");
    signers = await ethers.getSigners();

    const weth = await ethers.getContractAt("IWrappedEther", "0x4200000000000000000000000000000000000006");
    const usdc = await ethers.getContractAt("IERC20Metadata", "0x7F5c764cBc14f9669B88837ca1490cCa17c31607");
    const usdt = await ethers.getContractAt("IERC20Metadata", "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58");
    const dai = await ethers.getContractAt("IERC20Metadata", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1");
    const wbtc = await ethers.getContractAt("IERC20Metadata", "0x68f180fcCe6836688e9084f035309E29Bf0A2095");
    const frax = await ethers.getContractAt("IERC20Metadata", "0x2E3D870790dC77A83DD1d18184Acc7439A53f475");
    const wstEthCrv = await ethers.getContractAt("IERC20Metadata", "0xEfDE221f306152971D8e9f181bFe998447975810");

    const mooHopUSDC = await ethers.getContractAt("IERC20Metadata", "0xE2f035f59De6a952FF699b4EDD0f99c466f25fEc");
    const mooCurveFsUSD = await ethers.getContractAt("IERC20Metadata", "0x107Dbf9c9C0EF2Df114159e5C7DC2baf7C444cFF");
    const mooStargateUsdc = await ethers.getContractAt("IERC20Metadata", "0xe536F8141D8EB7B1f096934AF3329cB581bFe995");
    const mooCurveWSTETH = await ethers.getContractAt("IERC20Metadata", "0x0892a178c363b4739e5Ac89E9155B9c30214C0c0");
    const ldo = await ethers.getContractAt("IERC20Metadata", "0xFdb794692724153d1488CcdBE0C56c252596735F");
    const op = await ethers.getContractAt("IERC20Metadata", "0x4200000000000000000000000000000000000042");
    const yvUSDC = await ethers.getContractAt("IERC20Metadata", "0xaD17A225074191d5c8a37B50FdA1AE278a2EE6A2");
    const yvUSDT = await ethers.getContractAt("IERC20Metadata", "0xFaee21D0f0Af88EE72BB6d68E54a90E6EC2616de");
    const yvDAI = await ethers.getContractAt("IERC20Metadata", "0x65343F414FFD6c97b0f6add33d16F6845Ac22BAc");
    const yvOP = await ethers.getContractAt("IERC20Metadata", "0x7D2382b1f8Af621229d33464340541Db362B4907");

    const mooVelodromeMAIUSDC = await ethers.getContractAt("IERC20Metadata", "0x01D9cfB8a9D43013a1FdC925640412D8d2D900F0");
    const dola = await ethers.getContractAt("IERC20Metadata", "0x8aE125E8653821E851F12A49F7765db9a9ce7384");
    const mooVelodromeDOLAMAI = await ethers.getContractAt("IERC20Metadata", "0xa9913D2DA71768CD13eA75B05D9E91A3120E2f08");
    const mooVelodromeDOLAFRAX = await ethers.getContractAt("IERC20Metadata", "0xe282AD2480fFD8e34454C56c4360E5ba3240a429");

    const supportedCoinList: (IERC20Metadata | IWrappedEther)[] = [];
    customAmounts[wbtc.address] = parseUnits("0.001", await wbtc.decimals());
    customAmounts[mooStargateUsdc.address] = parseUnits("1.0", await usdc.decimals());
    customAmounts[mooVelodromeMAIUSDC.address] = parseUnits("0.000001", await mooVelodromeMAIUSDC.decimals());

    supportedCoinList.push(usdc, usdt, dai, weth, wbtc, frax, wstEthCrv, mooHopUSDC, mooCurveFsUSD, mooStargateUsdc, mooCurveWSTETH, ldo, op, yvUSDC, yvUSDT, yvDAI, yvOP,
        mooVelodromeMAIUSDC, dola, mooVelodromeDOLAMAI, mooVelodromeDOLAFRAX);

    await weth.deposit({ value: parseEther("1000.0") });

    // get all supported coins - swap ETH for all coins
    for (let i = 0; i < supportedCoinList.length; i++) {
        const coin = supportedCoinList[i];
        if (coin.address == weth.address) continue;
        const ethToCoinAmount = parseEther("10.0");
        await testSwap(nativeEth, coin.address, ethToCoinAmount);
    }
    console.log();

    for (let i = 0; i < supportedCoinList.length; i++) {
        for (let j = 0; j < supportedCoinList.length; j++) {
            if (i == j) continue;

            const coinIn = supportedCoinList[i];
            const coinOut = supportedCoinList[j];

            const amount = customAmounts[coinIn.address] == null ?
                parseUnits("0.5", await coinIn.decimals()) :
                customAmounts[coinIn.address];
            await testSwap(coinIn.address, coinOut.address, amount);
        }
        console.log();
    }

    // swap rest of all coins to eth
    for (let i = 0; i < supportedCoinList.length; i++) {
        const coin = supportedCoinList[i];
        if (coin.address == weth.address) continue;
        const amount = await coin.balanceOf(signers[0].address);
        await testSwap(coin.address, nativeEth, amount);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})