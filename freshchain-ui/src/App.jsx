import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { QRCodeCanvas } from "qrcode.react";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contract";
import "./index.css";

export default function App() {
  // ---------------- Core ----------------
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null); // write & read ikisi de olur (view çağrıları da çalışır)
  const [role, setRole] = useState("producer"); // admin|producer|transporter|distributor|retailer|customer

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const hasMM = useMemo(() => typeof window !== "undefined" && !!window.ethereum, []);

  const shortAddr = (addr) => (addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "");

  function resetMessages() {
    setStatus("");
    setError("");
  }

  function requireContract() {
    if (!contract) {
      setError("Önce MetaMask bağla.");
      return false;
    }
    return true;
  }

  function getErrMsg(e) {
    return (
      e?.reason ||
      e?.shortMessage ||
      e?.info?.error?.message ||
      e?.data?.message ||
      e?.message ||
      "Bilinmeyen hata"
    );
  }

  // Sepolia enforce (chainId: 11155111)
  async function ensureSepolia() {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const net = await provider.getNetwork();
    if (net.chainId !== 11155111n) {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }], // Sepolia
      });
    }
    return provider;
  }

  async function rebuildContractAndAccount() {
    const provider = await ensureSepolia();
    const signer = await provider.getSigner();
    const addr = await signer.getAddress();
    const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    setAccount(addr);
    setContract(c);
  }

  // MetaMask account/network changes
  useEffect(() => {
    if (!hasMM) return;

    const onAccountsChanged = async (accs) => {
      if (!accs || accs.length === 0) {
        setAccount("");
        setContract(null);
        setStatus("");
        setError("MetaMask bağlantısı kesildi.");
        return;
      }
      try {
        // ✅ EN ÖNEMLİ FIX: account değişince contract'ı yeni signer ile yeniden kur
        await rebuildContractAndAccount();
        setError("");
      } catch (e) {
        console.error("accountsChanged:", e);
        setError(getErrMsg(e));
      }
    };

    const onChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, [hasMM]);

  // ---------------- Connect Wallet ----------------
  async function connectWallet() {
    try {
      resetMessages();
      setLoading(true);

      if (!hasMM) {
        setError("MetaMask yok. Eklentiyi kur.");
        return;
      }

      const provider = await ensureSepolia();
      await provider.send("eth_requestAccounts", []);
      await rebuildContractAndAccount();

      setStatus("Bağlandı ✅");
    } catch (e) {
      console.error("connectWallet:", e);
      if (e?.code === 4001) setError("MetaMask isteği reddedildi.");
      else if (e?.code === -32002) setError("MetaMask’ta bekleyen istek var. MetaMask’ı aç.");
      else setError(getErrMsg(e));
    } finally {
      setLoading(false);
    }
  }

  // ---------------- Admin: register roles ----------------
  async function adminRegister(kind) {
    try {
      resetMessages();
      if (!requireContract()) return;

      const addr = prompt(`${kind} adresi (0x...) yaz:`);
      if (!addr) return;
      if (!ethers.isAddress(addr)) {
        alert("Geçersiz adres!");
        return;
      }

      setLoading(true);
      setStatus(`${kind} ekleniyor... MetaMask onayı bekleniyor`);

      let tx;
      if (kind === "Üretici") tx = await contract.registerProducer(addr);
      if (kind === "Taşıyıcı") tx = await contract.registerTransporter(addr);
      if (kind === "Distributor") tx = await contract.registerDistributor(addr);
      if (kind === "Market") tx = await contract.registerRetailer(addr);

      setStatus("Onaylandı, zincire yazılıyor...");
      await tx.wait();

      setStatus(`✅ ${kind} kaydedildi: ${shortAddr(addr)}`);
    } catch (e) {
      console.error("adminRegister:", e);
      setError(getErrMsg(e));
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  // ---------------- Producer: create batch + QR ----------------
  const [batchId, setBatchId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [qrValue, setQrValue] = useState("");

  async function createBatchAndQR() {
    try {
      resetMessages();
      setQrValue("");
      if (!requireContract()) return;

      const bid = Number(batchId);
      const qty = Number(quantity);

      if (!Number.isFinite(bid) || bid <= 0) return setError("Batch ID sayı olmalı (örn 106).");
      if (!productName) return setError("Ürün adı boş olamaz.");
      if (!Number.isFinite(qty) || qty <= 0) return setError("Miktar sayı olmalı (örn 30).");

      setLoading(true);
      setStatus("Batch oluşturma: MetaMask onayı bekleniyor...");

      const tx = await contract.createBatch(BigInt(bid), productName, BigInt(qty));
      setStatus("Onaylandı, blokta işleniyor...");
      await tx.wait();

      setStatus("✅ Ürün Hazır!");
      setQrValue(String(bid));
    } catch (e) {
      console.error("createBatchAndQR:", e);
      const msg = getErrMsg(e);

      // ✅ Batch zaten varsa QR'ı yine göster
      if (String(msg).toLowerCase().includes("already exists")) {
        setQrValue(String(batchId));
        setStatus("⚠️ Batch zaten vardı. QR tekrar gösterildi.");
        setError("");
        return;
      }

      setError(msg);
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  // ---------------- Transporter: add sensor data ----------------
  const [sensorBatchId, setSensorBatchId] = useState("");
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [location, setLocation] = useState("");

  async function addSensorData() {
    try {
      resetMessages();
      if (!requireContract()) return;

      const bid = Number(sensorBatchId);
      const t = Number(temperature);
      const h = Number(humidity);

      if (!Number.isFinite(bid) || bid <= 0) return setError("Batch ID geçersiz.");
      if (!Number.isFinite(t) || t < -10 || t > 40) return setError("Sıcaklık -10 ile 40 arasında olmalı.");
      if (!Number.isFinite(h) || h < 0 || h > 40) return setError("Nem 0 ile 40 arasında olmalı.");
      if (!location) return setError("Lokasyon boş olamaz.");

      setLoading(true);
      setStatus("Sensör verisi için MetaMask onayı bekleniyor...");

      const tx = await contract.addSensorData(
        BigInt(bid),
        BigInt(Math.trunc(t)),
        BigInt(Math.trunc(h)),
        location
      );
      setStatus("Onaylandı, blokta işleniyor...");
      await tx.wait();

      setStatus("✅ Sensör verisi eklendi!");
    } catch (e) {
      console.error("addSensorData:", e);
      setError(getErrMsg(e));
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  // ---------------- Distributor: transfer ownership ----------------
  const [transferBatchId, setTransferBatchId] = useState("");
  const [newOwner, setNewOwner] = useState("");

  async function transferOwnership() {
    try {
      resetMessages();
      if (!requireContract()) return;

      const bid = Number(transferBatchId);
      if (!Number.isFinite(bid) || bid <= 0) return setError("Batch ID geçersiz.");
      if (!ethers.isAddress(newOwner)) return setError("Yeni owner adresi geçersiz.");

      setLoading(true);
      setStatus("Transfer için MetaMask onayı bekleniyor...");

      const tx = await contract.transferOwnership(BigInt(bid), newOwner);
      setStatus("Onaylandı, blokta işleniyor...");
      await tx.wait();

      setStatus(`✅ Ownership transfer edildi → ${shortAddr(newOwner)}`);
    } catch (e) {
      console.error("transferOwnership:", e);
      setError(getErrMsg(e));
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  // ---------------- Retailer: mark as arrived ----------------
  const [arriveBatchId, setArriveBatchId] = useState("");
  const [passedInspection, setPassedInspection] = useState(true);

  async function markAsArrived() {
    try {
      resetMessages();
      if (!requireContract()) return;

      const bid = Number(arriveBatchId);
      if (!Number.isFinite(bid) || bid <= 0) return setError("Batch ID geçersiz.");

      setLoading(true);
      setStatus("Market onayı için MetaMask onayı bekleniyor...");

      const tx = await contract.markAsArrived(BigInt(bid), !!passedInspection);
      setStatus("Onaylandı, blokta işleniyor...");
      await tx.wait();

      setStatus(!!passedInspection ? "✅ MARKET ONAYLADI (GÜVENLİ)" : "⚠️ MARKET REDDETTİ (RİSKLİ)");
    } catch (e) {
      console.error("markAsArrived:", e);
      setError(getErrMsg(e));
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  // ---------------- Customer: query batch history ----------------
  const [queryId, setQueryId] = useState("");
  const [batchInfo, setBatchInfo] = useState(null);
  const [sensorLogs, setSensorLogs] = useState([]);

  async function queryBatch() {
    try {
      resetMessages();
      setBatchInfo(null);
      setSensorLogs([]);

      if (!requireContract()) return;

      const bid = Number(queryId);
      if (!Number.isFinite(bid) || bid <= 0) return setError("Batch ID geçersiz.");

      setLoading(true);
      setStatus("Sorgulanıyor...");

      // ✅ DOĞRU: 3 parça döner -> (Batch batch, SensorData[] sensors, TransferEvent[] ownerships)
      const res = await contract.getBatchHistory(BigInt(bid));

      const batch = res[0];
      const sensors = res[1];
      // const ownerships = res[2]; // istersen sonra ekleriz

      setBatchInfo({
        productName: batch.productName,
        quantity: batch.quantity?.toString?.() ?? String(batch.quantity),
        arrived: batch.arrivedAtRetailer,
        passedInspection: batch.passedInspection,
        currentOwner: batch.currentOwner,
      });

      if (Array.isArray(sensors)) {
        const logs = sensors.map((s) => ({
          location: s.location,
          temperature: s.temperature?.toString?.() ?? String(s.temperature),
          humidity: s.humidity?.toString?.() ?? String(s.humidity),
          timestamp: s.timestamp
            ? new Date(Number(s.timestamp) * 1000).toLocaleString()
            : "-",
          recordedBy: s.recordedBy,
        }));
        setSensorLogs(logs);
      }

      setStatus("✅ Sorgu tamamlandı");
    } catch (e) {
      console.error("queryBatch:", e);
      setError(getErrMsg(e));
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  // ---------------- UI ----------------
  const Header = (
    <div className="card">
      <h1 className="title">FreshChain Dashboard</h1>

      <button className="btn" onClick={connectWallet} disabled={loading}>
        {loading ? "Lütfen bekle..." : "Cüzdanı Bağla"}
      </button>

      {error && <div className="err">Bağlantı Hatası: {error}</div>}
      {status && <div className="hint">{status}</div>}

      {account && (
        <div className="badge">
          ✅ Bağlı Hesap: <b>{shortAddr(account)}</b>
        </div>
      )}

      <div className="roleRow">
        <div className="roleLabel">Sisteme Hangi Rol ile Gireceksiniz?</div>
        <select
          className="select"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            resetMessages();
            setQrValue("");
            setBatchInfo(null);
            setSensorLogs([]);
          }}
        >
          <option value="admin">🔑 Admin (Yönetici)</option>
          <option value="producer">👨‍🌾 Üretici (Çiftçi)</option>
          <option value="transporter">🚚 Taşıyıcı</option>
          <option value="distributor">🏭 Distributor (Depo)</option>
          <option value="retailer">🏪 Market (Retailer)</option>
          <option value="customer">🧾 Müşteri</option>
        </select>
      </div>
    </div>
  );

  const AdminPanel =
    account && role === "admin" ? (
      <div className="panel">
        <h2 className="panelTitle">Admin Paneli</h2>

        <div className="btnRow">
          <button className="btnDark" onClick={() => adminRegister("Üretici")} disabled={loading}>
            Üretici Ekle
          </button>
          <button className="btnDark" onClick={() => adminRegister("Taşıyıcı")} disabled={loading}>
            Taşıyıcı Ekle
          </button>
          <button className="btnDark" onClick={() => adminRegister("Distributor")} disabled={loading}>
            Distributor Ekle
          </button>
          <button className="btnDark" onClick={() => adminRegister("Market")} disabled={loading}>
            Market Ekle
          </button>
        </div>

        <div className="hint" style={{ marginTop: 12 }}>
          Not: Bu işlemler genelde <b>owner</b> hesabıyla yapılır.
        </div>
      </div>
    ) : null;

  const ProducerPanel =
    account && role === "producer" ? (
      <div className="panel">
        <h2 className="panelTitle">Üretici Paneli</h2>

        <input className="input" placeholder="Batch ID (örn 106)" value={batchId} onChange={(e) => setBatchId(e.target.value)} />
        <input className="input" placeholder="Ürün (örn kivi)" value={productName} onChange={(e) => setProductName(e.target.value)} />
        <input className="input" placeholder="Miktar (örn 30)" value={quantity} onChange={(e) => setQuantity(e.target.value)} />

        <button className="btnGreen" onClick={createBatchAndQR} disabled={loading}>
          {loading ? "Onay bekleniyor..." : "Batch Oluştur & QR Üret"}
        </button>

        {qrValue && (
          <div className="readyBox">
            <div className="readyTitle">✅ Ürün Hazır!</div>
            <div className="readyText">Kutunun üzerine yapıştırılacak QR Kod:</div>
            <div className="qrWrap">
              <QRCodeCanvas value={qrValue} size={190} />
            </div>
            <div className="readyId">ID: {qrValue}</div>
          </div>
        )}
      </div>
    ) : null;

  const TransporterPanel =
    account && role === "transporter" ? (
      <div className="panel">
        <h2 className="panelTitle">Taşıyıcı Paneli</h2>

        <input className="input" placeholder="Batch ID (örn 106)" value={sensorBatchId} onChange={(e) => setSensorBatchId(e.target.value)} />
        <input className="input" placeholder="Sıcaklık (°C) -10..40" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
        <input className="input" placeholder="Nem (%) 0..40 (örn 20)" value={humidity} onChange={(e) => setHumidity(e.target.value)} />
        <input className="input" placeholder="Lokasyon (örn Bursa)" value={location} onChange={(e) => setLocation(e.target.value)} />

        <button className="btnGreen" onClick={addSensorData} disabled={loading}>
          {loading ? "Onay bekleniyor..." : "Sensör Verisi Ekle"}
        </button>
      </div>
    ) : null;

  const DistributorPanel =
    account && role === "distributor" ? (
      <div className="panel">
        <h2 className="panelTitle">Distributor Paneli</h2>

        <input className="input" placeholder="Batch ID (örn 106)" value={transferBatchId} onChange={(e) => setTransferBatchId(e.target.value)} />
        <input className="input" placeholder="Yeni Owner Adresi (Market) 0x..." value={newOwner} onChange={(e) => setNewOwner(e.target.value)} />

        <button className="btnGreen" onClick={transferOwnership} disabled={loading}>
          {loading ? "Onay bekleniyor..." : "Ownership Transfer"}
        </button>
      </div>
    ) : null;

  const RetailerPanel =
    account && role === "retailer" ? (
      <div className="panel">
        <h2 className="panelTitle">Market Paneli</h2>

        <input className="input" placeholder="Batch ID (örn 106)" value={arriveBatchId} onChange={(e) => setArriveBatchId(e.target.value)} />

        <div style={{ display: "flex", justifyContent: "center", gap: 10, alignItems: "center", marginTop: 8 }}>
          <input type="checkbox" checked={passedInspection} onChange={(e) => setPassedInspection(e.target.checked)} style={{ transform: "scale(1.2)" }} />
          <div style={{ fontWeight: 800 }}>Market Onayı (Passed Inspection)</div>
        </div>

        <button className="btnGreen" onClick={markAsArrived} disabled={loading} style={{ marginTop: 12 }}>
          {loading ? "Onay bekleniyor..." : "Onayla / Reddet"}
        </button>
      </div>
    ) : null;

  const CustomerPanel =
    account && role === "customer" ? (
      <div className="panel">
        <h2 className="panelTitle">Ürün Sorgulama</h2>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <input className="input" style={{ maxWidth: 520 }} placeholder="Batch ID (örn 106)" value={queryId} onChange={(e) => setQueryId(e.target.value)} />
          <button className="btnGreen" onClick={queryBatch} disabled={loading}>
            {loading ? "Sorgulanıyor..." : "Sorgula"}
          </button>
        </div>

        {batchInfo && (
          <div
            style={{
              marginTop: 18,
              background: "#eaf4e8",
              borderRadius: 14,
              padding: 18,
              maxWidth: 760,
              marginInline: "auto",
              textAlign: "left",
            }}
          >
            <div style={{ display: "grid", gap: 10, fontSize: 18 }}>
              <div>
                📦 <b>Ürün:</b> {batchInfo.productName}
              </div>
              <div>
                ⚖️ <b>Miktar:</b> {batchInfo.quantity} kg
              </div>
              <div>
                👤 <b>Güncel Sahip:</b> {shortAddr(batchInfo.currentOwner)}
              </div>

              <div style={{ fontWeight: 900, color: "#2e7d32" }}>
                ✅ <b>Market Durumu:</b>{" "}
                {batchInfo.arrived ? (batchInfo.passedInspection ? "MARKET ONAYLADI (GÜVENLİ)" : "MARKET REDDETTİ (RİSKLİ)") : "HENÜZ MARKETE ULAŞMADI"}
              </div>
            </div>

            <div style={{ marginTop: 14, fontWeight: 900, color: "#2e7d32" }}>Sensör Geçmişi:</div>

            <div style={{ marginTop: 10 }}>
              {sensorLogs.length === 0 ? (
                <div style={{ color: "#333" }}>Sensör kaydı yok.</div>
              ) : (
                sensorLogs.map((log, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "white",
                      borderRadius: 12,
                      padding: 14,
                      marginTop: 10,
                      borderLeft: "5px solid #2e7d32",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>📍 {log.location}</div>
                    <div style={{ marginTop: 6 }}>
                      🌡️ <b>{log.temperature}</b>°C &nbsp; | &nbsp; 💧 <b>%{log.humidity}</b> Nem
                    </div>
                    <div style={{ marginTop: 6, fontSize: 14, opacity: 0.9 }}>
                      🕒 {log.timestamp} &nbsp; | &nbsp; 👤 {shortAddr(log.recordedBy)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    ) : null;

  return (
    <div className="page">
      {Header}
      {AdminPanel}
      {ProducerPanel}
      {TransporterPanel}
      {DistributorPanel}
      {RetailerPanel}
      {CustomerPanel}
    </div>
  );
}
