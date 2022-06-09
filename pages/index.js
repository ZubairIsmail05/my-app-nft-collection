import { Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import { abi, NFT_CONTRACT_ADDRESS } from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {

  // track whether or not wallet has been conencted to site
  const [walletConnected, setWalletConnected] = useState(false);
  // track whether or not presale to mint NFTs has started
  const [presaleStarted, setPresaleStarted] = useState(false);
  // track whether or not presale to mint NFTs has ended
  const [presaleEnded, setPresaleEnded] = useState(false);
  // set to true when transaction is being mined
  const [loading, setLoading] = useState(false);
  // checks if address currently connected to wallet is the owner
  const [isOwner, setIsOwner] = useState(false)
  // tracks number of tokens that have been minted
  const [tokenIdsMinted, setTokenIdsMinted] = useState("0");
  // Create reference to Web3 Modal(used to connect to MetaMask), persists as long as page is open
  const web3ModalRef = useRef();

  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to MetaMask
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // check if user is connected to Rinkeby
    const { chainId } = await web3Provider.getNetwork();
    if (chainId != 4) {
      window.alert("Please connect to the Rinkey Testnet.");
      throw new Error("Change network to Rinkeby");
    }

    // function returns signer if needed
    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  // Connect MetaMask wallet
  const connectWallet = async () => {
    try {
      // get provider from web3Modal --> MetaMask
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Mint an NFT during presale
  const presaleMint = async () => {
    try {
      // get signer
      const signer = await getProviderOrSigner(true);
      // create contract
      const whitelistContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
      // call presaleMint from contract
      const tx = await whitelistContract.presaleMint({ value: utils.parseEther("0.01"), });
      // Loading is true while transaction is being mined
      setLoading(true);
      // wait for transaction to be mined
      await tx.wait();
      setLoading(false);
      window.alert("You successfully minted a Crypto Dev!");
    } catch (err) {
      console.error(err);
    }
  };

  // mint an NFT after presale has ended
  const publicMint = async () => {
    try {
      // get signer
      const signer = await getProviderOrSigner(true);
      // create contract
      const whitelistContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
      // call mint function from contract
      const tx = await whitelistContract.mint({ value: utils.parseEther("0.01"), });
      // Loading is true while transaction is being mined
      setLoading(true);
      // wait for transaction to be mined
      await tx.wait();
      setLoading(false);
      window.alert("You successfully minted a Crypto Dev!");
    } catch (err) {
      console.error(err);
    }
  };

  // start presale for NFT Collection
  const startPresale = async () => {
    try {
      // get signer bc this is a write transaction --> changing state var
      const signer = await getProviderOrSigner(true);
      // create contract
      const whitelistContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
      // call startPresale function from contract
      const tx = await whitelistContract.startPresale();
      // Loading is true while transaction is being mined
      setLoading(true);
      // wait for transaction to be mined
      await tx.wait();
      setLoading(false);
      await checkIfPresaleStarted();
    } catch (err) {
      console.error(err);
    }
  };

  // checks if presale has started by querying 'presaleStarted' from contract
  const checkIfPresaleStarted = async () => {
    try {
      // need provider bc only reading from blockchain
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      // query 'presaleStarted' from contract
      const _presaleStarted = await nftContract.presaleStarted();
      if (!_presaleStarted) {
        await getOwner();
      }
      // state updated based on contract
      setPresaleStarted(_presaleStarted);
      return _presaleStarted;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // checks if presale has started by querying 'presaleEnded' from contract
  const checkIfPresaleEnded = async () => {
    try {
      // need provider bc only reading from blockchain
      const provider = await getProviderOrSigner();
      // create contract
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      // query 'presaleEnded' from contract
      const _presaleEnded = await nftContract.presaleEnded();
      // if _presaleEnded < current timestamp, presale has ended
      const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000));
      if (hasEnded) {
        setPresaleEnded(true);
      } else {
        setPresaleEnded(false);
      }
      return hasEnded;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // calls contract to get Owner
  const getOwner = async () => {
    try {
      // need provider bc only reading from blockchain
      const provider = await getProviderOrSigner();
      // create contract
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      // query contract for owner
      const _owner = await nftContract.owner();
      // get signer to get address from MetaMask
      const signer = await getProviderOrSigner(true);
      // get address associated with MetaMask
      const address = await signer.getAddress();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  // get number of token IDs that have been minted
  const getTokenIdsMinted = async () => {
    try {
      // need provider bc only reading from blockchain
      const provider = await getProviderOrSigner();
      // create contract
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      // query contract for owner
      const _tokenIds = await nftContract.tokenIds();
      // _tokenIds is a Big Number, needs to be converted to string
      setTokenIdsMinted(_tokenIds.toString());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // if wallet is not connected, create a new Web3Modal instance and connect to MetaMask
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();

      // check if presale has started or ended
      const _presaleStarted = checkIfPresaleStarted();
      if (_presaleStarted) {
        checkIfPresaleEnded();
      }

      getTokenIdsMinted();

      // interval called every 5 seconds to check if preale has ended
      const presaleEndedInterval = setInterval(async function () {
        const _presaleStarted = await checkIfPresaleStarted();
        if (_presaleStarted) {
          const _presaleEnded = await checkIfPresaleEnded();
          if (_presaleEnded) {
            clearInterval(presaleEndedInterval)
          }
        }
      }, 5 * 1000);
      // set interval to get number of token Ids minted every 5 seconds
      setInterval(async function () {
        await getTokenIdsMinted();
      }, 5 * 1000);
    }
  }, [walletConnected]);

  // returns a button based on state of the dapp
  const renderButton = () => {
    // show "Connect Wallet" button if user has not connected their wallet yet
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect Wallet
        </button>
      );
    }

    // show while transaction is being mined
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }

    // if the connected user is the owner and the presale has not started yet, show start presale button
    if (isOwner) {
      return (
        <button className={styles.button} onClick={startPresale}>
          Start Presale
        </button>
      );
    }

    // if connected user is not the owner and the presale has not started yet
    if (!presaleStarted) {
      return (
        <div>
          <div className={styles.description}>Presale hasn't started</div>
        </div>
      );
    }

    // if presale started but hasn't ended, show presale minting button
    if (presaleStarted && !presaleEnded) {
      return (
        <div>
          <div className={styles.description}>
            Presale has started!!! If your address is whitelisted, Mint a
            Crypto Dev 🥳
          </div>
          <button className={styles.button} onClick={presaleMint}>
            Presale Mint 🚀
          </button>
        </div>
      );
    }

    // if presale started and has ended, show public minting button
    if (presaleStarted && presaleEnded) {
      return (
        <button className={styles.button} onClick={publicMint}>
          Public Mint 🚀
        </button>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>
            Its an NFT collection for developers in Crypto.
          </div>
          <div className={styles.description}>
            {tokenIdsMinted}/20 have been minted
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./cryptodevs/0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  );

}
