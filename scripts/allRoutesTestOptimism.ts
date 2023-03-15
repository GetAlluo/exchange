import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, BigNumberish, constants } from "ethers";
import { formatEther, formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { Exchange, IERC20Metadata } from "../typechain";

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

    const supportedCoinList: IERC20Metadata[] = [];
    await weth.deposit({ value: parseEther("1000.0") });

    // get all supported coins - swap ETH for all coins
    for (let i = 0; i < supportedCoinList.length; i++) {
        const coin = supportedCoinList[i];
        if (coin.address == weth.address) continue;
        const ethToCoinAmount = parseEther("20.0");
        await testSwap(nativeEth, coin.address, ethToCoinAmount);
    }
    console.log();

    for (let i = 0; i < supportedCoinList.length; i++) {
        for (let j = 0; j < supportedCoinList.length; j++) {
            if (i == j) continue;

            const coinIn = supportedCoinList[i];
            const coinOut = supportedCoinList[j];

            const amount = customAmounts[coinIn.address] == null ?
                parseUnits("1", await coinIn.decimals()) :
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