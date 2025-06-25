import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { Alchemy, Network } from "alchemy-sdk";
import DonationABI from "./Donation.json";
import TestTokenABI from "./TestToken.json";
import "./App.css";

const DONATION_ADDRESS = "0x00Ce02F63d01aB52996E17f422698A04ac651abc";
const TOKEN_ADDRESS = "0x008f4592f43A280d553A56e8f237B846Aeee4134";
const ALCHEMY_API_KEY = process.env.REACT_APP_ALCHEMY_API_KEY;

function App() {
  const [account, setAccount] = useState(null);
  const [donationContract, setDonationContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [amount, setAmount] = useState("");
  const [totalDonations, setTotalDonations] = useState(0);
  const [userDonation, setUserDonation] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [error, setError] = useState("");
  const [dataError, setDataError] = useState(""); // New state for data update errors
  const [successMessage, setSuccessMessage] = useState("");
  const [txHistory, setTxHistory] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasCheckedConnection, setHasCheckedConnection] = useState(false);

  const alchemy = useMemo(
    () => new Alchemy({ apiKey: ALCHEMY_API_KEY, network: Network.ETH_SEPOLIA }),
    []
  );

  const retry = async (fn, retries = 3, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  const updateDonationData = useCallback(
    async (account, donationContract, tokenContract) => {
      try {
        console.log("Updating donation data for account:", account);
        const total = await retry(() => donationContract.totalDonations());
        setTotalDonations(ethers.formatEther(total));
        const userDon = await retry(() => donationContract.getDonation(account));
        setUserDonation(ethers.formatEther(userDon));

        let balance = 0;
        try {
          const response = await retry(() =>
            alchemy.core.getTokenBalances(account, [TOKEN_ADDRESS])
          );
          console.log("Alchemy response:", response);
          balance = response.tokenBalances[0]?.tokenBalance
            ? parseInt(response.tokenBalances[0].tokenBalance, 16) / 10 ** 18
            : 0;
        } catch (alchemyError) {
          console.warn("Alchemy failed, falling back to contract:", alchemyError);
          const balanceWei = await retry(() => tokenContract.balanceOf(account));
          balance = ethers.formatEther(balanceWei);
        }

        setTokenBalance(balance);
        setDataError("");
      } catch (error) {
        console.error("Error saat memperbarui data donasi:", error);
        setDataError("Gagal memperbarui data donasi. Silakan refresh halaman.");
      }
    },
    [alchemy, setDataError, setTokenBalance, setTotalDonations, setUserDonation]
  );

  const connectWallet = useCallback(
    async () => {
      if (!window.ethereum) {
        setError("MetaMask belum terinstal. Silakan instal MetaMask.");
        return;
      }

      if (isConnecting) {
        setError("Permintaan koneksi wallet sedang diproses. Silakan tunggu.");
        return;
      }

      setIsConnecting(true);
      try {
        console.log("Connecting wallet...");
        const provider = new ethers.BrowserProvider(window.ethereum);
        let selectedAccount;

        const accounts = await provider.listAccounts();
        console.log("listAccounts result:", accounts);
        if (accounts.length > 0) {
          selectedAccount = accounts[0];
        } else {
          const newAccounts = await provider.send("eth_requestAccounts", []);
          console.log("eth_requestAccounts result:", newAccounts);
          if (newAccounts.length === 0) {
            throw new Error("Tidak ada akun yang dipilih.");
          }
          selectedAccount = newAccounts[0];
        }

        if (typeof selectedAccount !== "string") {
          throw new Error("Akun tidak valid.");
        }

        if (selectedAccount === account) {
          setIsConnecting(false);
          return;
        }

        setAccount(selectedAccount);
        localStorage.setItem("lastAccount", selectedAccount); // Store account for refresh

        const network = await provider.getNetwork();
        console.log("Network chainId:", network.chainId);
        if (network.chainId !== 11155111n) {
          setError("Silakan alihkan MetaMask ke Sepolia Testnet.");
          setIsConnecting(false);
          return;
        }

        const signer = await provider.getSigner();
        const donation = new ethers.Contract(
          DONATION_ADDRESS,
          DonationABI,
          signer
        );
        const token = new ethers.Contract(
          TOKEN_ADDRESS,
          TestTokenABI,
          signer
        );
        setDonationContract(donation);
        setTokenContract(token);

        await updateDonationData(selectedAccount, donation, token);
        setError("");
      } catch (error) {
        console.error("Error saat menghubungkan wallet:", error);
        if (error.code === -32002) {
          setError("Permintaan koneksi wallet sedang diproses. Silakan selesaikan di MetaMask.");
        } else if (error.code === 4001) {
          setError("Koneksi wallet dibatalkan oleh pengguna.");
        } else {
          setError(`Gagal menghubungkan wallet: ${error.message}`);
        }
      } finally {
        setIsConnecting(false);
      }
    },
    [
      account,
      updateDonationData,
      isConnecting,
      setError,
      setIsConnecting,
      setDonationContract,
      setTokenContract,
    ]
  );

  const disconnectWallet = useCallback(
    async () => {
      try {
        if (window.ethereum && window.ethereum.request) {
          await window.ethereum.request({ method: "wallet_disconnect" }).catch((err) => {
            console.warn("wallet_disconnect tidak didukung:", err);
          });
        }
      } catch (error) {
        console.error("Error saat memutuskan sesi MetaMask:", error);
      } finally {
        setAccount(null);
        setDonationContract(null);
        setTokenContract(null);
        setTotalDonations(0);
        setUserDonation(0);
        setTokenBalance(0);
        setTxHistory([]);
        setError("");
        setDataError("");
        setSuccessMessage("");
        setAmount("");
        setHasCheckedConnection(false);
        localStorage.removeItem("lastAccount"); // Clear stored account
      }
    },
    [
      setError,
      setDataError,
      setSuccessMessage,
      setAmount,
      setHasCheckedConnection,
      setTokenBalance,
      setDonationContract,
      setTokenContract,
      setTotalDonations,
      setUserDonation,
      setTxHistory,
    ]
  );

  useEffect(() => {
    if (!window.ethereum || hasCheckedConnection || account) return;

    const checkConnection = async () => {
      try {
        console.log("Checking initial connection...");
        const provider = new ethers.BrowserProvider(window.ethereum);
        let accounts = await provider.listAccounts();
        console.log("Initial listAccounts:", accounts);

        if (accounts.length === 0) {
          accounts = await provider.send("eth_accounts", []);
          console.log("eth_accounts result:", accounts);
        }

        const lastAccount = localStorage.getItem("lastAccount");
        console.log("Last account from localStorage:", lastAccount);

        if ((accounts.length > 0 || lastAccount) && !account) {
          await connectWallet();
        }
      } catch (error) {
        console.error("Error saat memeriksa koneksi awal:", error);
      } finally {
        setHasCheckedConnection(true);
      }
    };

    checkConnection();

    window.ethereum?.on("accountsChanged", (accounts) => {
      console.log("accountsChanged event:", accounts);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        connectWallet();
      } else {
        disconnectWallet();
      }
    });

    window.ethereum?.on("disconnect", () => {
      console.log("disconnect event");
      disconnectWallet();
    });

    return () => {
      window.ethereum?.removeListener("accountsChanged", () => {});
      window.ethereum?.removeListener("disconnect", () => {});
    };
  }, [connectWallet, disconnectWallet, hasCheckedConnection, account, setHasCheckedConnection]);

  const approveAndDonate = async () => {
    if (!amount || !donationContract || !tokenContract) {
      setError("Masukkan jumlah donasi dan hubungkan wallet.");
      return;
    }

    const donationAmount = parseFloat(amount);
    if (donationAmount <= 0) {
      setError("Masukkan nilai donasi lebih dari 0.");
      return;
    }

    setError("");
    setDataError("");
    setSuccessMessage("");
    try {
      const amountWei = ethers.parseEther(amount);

      const approveTx = await tokenContract.approve(
        DONATION_ADDRESS,
        amountWei
      );
      await approveTx.wait();

      const donateTx = await donationContract.donate(amountWei);
      await donateTx.wait();

      setTxHistory((prev) => [
        ...prev,
        {
          txHash: donateTx.hash,
          type: "Donation",
          timestamp: new Date().toLocaleString("id-ID"),
          amount: amount,
        },
      ]);

      // Delay to ensure blockchain state is updated
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await updateDonationData(account, donationContract, tokenContract);
      setSuccessMessage("Donasi berhasil!");
      setAmount("");
    } catch (error) {
      console.error("Error saat donasi:", error);
      if (error.code === 4001) {
        setError("Transaksi dibatalkan oleh pengguna.");
      } else {
        setError(`Transaksi donasi gagal: ${error.message}`);
      }
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>DeFi Donation Platform</h1>
        <p>Berdayakan masa depan dengan donasi berbasis blockchain</p>
      </header>
      <main className="main-content">
        {error && <p className="error-message">{error}</p>}
        {dataError && <p className="error-message">{dataError}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}
        {account && typeof account === "string" ? (
          <div className="dashboard">
            <div className="card-container">
              <div className="card">
                <h3>Akun Terhubung</h3>
                <p className="account-address">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </p>
                <button onClick={disconnectWallet} className="disconnect-button">
                  Putuskan Koneksi
                </button>
              </div>
              <div className="card">
                <h3>Total Donasi</h3>
                <p className="highlight">{totalDonations} TTK</p>
              </div>
              <div className="card">
                <h3>Donasi Anda</h3>
                <p className="highlight">{userDonation} TTK</p>
              </div>
              <div className="card">
                <h3>Saldo TestToken</h3>
                <p className="highlight">{tokenBalance} TTK</p>
              </div>
            </div>
            <div className="donation-form">
              <input
                type="text"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*\.?\d*$/.test(value)) {
                    setAmount(value);
                  }
                }}
                placeholder="Jumlah donasi (TTK)"
                className="donation-input"
              />
              <button onClick={approveAndDonate} className="donation-button">
                Donasi Sekarang
              </button>
            </div>
            <div className="transaction-history">
              <h2>Riwayat Donasi</h2>
              {txHistory.length === 0 ? (
                <p className="no-transactions">Belum ada donasi.</p>
              ) : (
                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>Jumlah</th>
                      <th>Waktu</th>
                      <th>Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txHistory.slice().reverse().map((tx, index) => (
                      <tr key={index}>
                        <td>{tx.amount} TTK</td>
                        <td>{tx.timestamp}</td>
                        <td>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tx-link"
                          >
                            {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <button onClick={connectWallet} className="connect-button" disabled={isConnecting}>
            {isConnecting ? "Menghubungkan..." : "Hubungkan Wallet"}
          </button>
        )}
      </main>
    </div>
  );
}

export default App;