import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contract";
import { QRCodeCanvas } from "qrcode.react";
import "./index.css";

const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

const ACCOUNTS = {
  admin: "0x93988b68Df34CBB8117BA2c834E52c9c4439DDa7",
  producer: "0x604b9CF5B8B460cbF4af690eF311DbB98025385B",
  distributor: "0xf6Df1CBEfcf9553AE4CbD913bECE7F5C637C0BF6",
  transporter: "0x5e623DE69E5E635d0CE40a8EF85779b3b64D4DE3",
  retailer: "0x61270330369206855495980D5b70Ce51d47de6eB",
};

const ROLE_LABEL = {
  admin: "Admin (Yönetici)",
  producer: "Üretici (Çiftçi)",
  transporter: "Taşıyıcı",
  distributor: "Distribütör",
  retailer: "Market",
  customer: "Müşteri",
};

const lower = (x) => String(x || "").toLowerCase();
const shortAddr = (a) => (!a ? "-" : `${a.slice(0, 6)}...${a.slice(-4)}`);

export default function App() {
  // --- LOGIN ---
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [loginRole, setLoginRole] = useState("producer");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // --- ROLE ---
  const [role, setRole] = useState("producer");

  // --- WALLET ---
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [connectedAddr, setConnectedAddr] = useState("");

  // --- UI STATE ---
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  // --- ADMIN inputs ---
  const [adminLastAdded, setAdminLastAdded] = useState("");

  // --- PRODUCER ---
  const [batchId, setBatchId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [createdBatchId, setCreatedBatchId] = useState("");

  // --- TRANSPORTER ---
  const [tBatchId, setTBatchId] = useState("");
  const [temp, setTemp] = useState("4");
  const [hum, setHum] = useState("20");
  const [location, setLocation] = useState("Bursa");

  // --- TRANSFER ---
  const [xBatchId, setXBatchId] = useState("");
  const [toAddr, setToAddr] = useState(ACCOUNTS.transporter);

  // --- RETAILER ---
  const [rBatchId, setRBatchId] = useState("");
  const [passedInspection, setPassedInspection] = useState(true);

  // --- CUSTOMER ---
  const [historyId, setHistoryId] = useState("");
  const [historyData, setHistoryData] = useState(null);

  const expectedAddr = useMemo(() => {
    if (role === "admin") return ACCOUNTS.admin;
    if (role === "producer") return ACCOUNTS.producer;
    if (role === "transporter") return ACCOUNTS.transporter;
    if (role === "distributor") return ACCOUNTS.distributor;
    if (role === "retailer") return ACCOUNTS.retailer;
    return "";
  }, [role]);

  // Role'a göre transfer hedefini otomatik seç
  useEffect(() => {
    if (role === "producer") setToAddr(ACCOUNTS.transporter);
    if (role === "transporter") setToAddr(ACCOUNTS.distributor);
    if (role === "distributor") setToAddr(ACCOUNTS.retailer);
  }, [role]);

  // ✅ QR ile gelindiyse (?batchId=123) → customer moduna geç + otomatik history çek
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bid = params.get("batchId");
    if (bid) {
      setRole("customer");
      setHistoryId(bid);
      getHistory(bid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contractRead = useMemo(() => {
    if (!provider) return null;
    try {
      return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    } catch {
      return null;
    }
  }, [provider]);

  const contractWrite = useMemo(() => {
    if (!signer) return null;
    try {
      return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    } catch {
      return null;
    }
  }, [signer]);

  async function ensureSepolia() {
    if (!window.ethereum) throw new Error("MetaMask yüklü değil.");
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId === SEPOLIA_CHAIN_ID_HEX) return;
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
  }

  async function refreshWallet() {
    if (!window.ethereum) return;
    const p = new ethers.BrowserProvider(window.ethereum);
    const s = await p.getSigner();
    const addr = await s.getAddress();
    setProvider(p);
    setSigner(s);
    setConnectedAddr(addr);
  }

  async function connectWallet() {
    try {
      setStatus("");
      if (!window.ethereum) throw new Error("MetaMask yüklü değil.");
      await ensureSepolia();
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await refreshWallet();
      setStatus("✅ Cüzdan bağlandı.");
    } catch (e) {
      setStatus(`❌ ${e?.message || "Cüzdan bağlanamadı."}`);
    }
  }

  useEffect(() => {
    if (!window.ethereum) return;

    const onAccountsChanged = async () => {
      await refreshWallet();
      setStatus("✅ Hesap değişti.");
    };
    const onChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener("chainChanged", onChainChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runTx(txPromise, okMsg) {
    try {
      setBusy(true);
      setStatus("⏳ MetaMask onayı bekleniyor...");
      const tx = await txPromise;
      setStatus(`⛓️ İşlem gönderildi: ${tx.hash}`);
      await tx.wait();
      setStatus(`✅ ${okMsg}`);
    } catch (e) {
      const msg =
        e?.shortMessage ||
        e?.info?.error?.message ||
        e?.reason ||
        e?.message ||
        "İşlem başarısız";
      setStatus(`❌ ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  function askAddress(promptText, defaultValue = "") {
    const v = window.prompt(promptText, defaultValue);
    if (v === null) return null;
    return String(v).trim();
  }

  function loginSubmit() {
    if (!username.trim() || !password.trim()) {
      setStatus("❌ Kullanıcı adı / şifre boş olamaz.");
      return;
    }
    setIsLoggedIn(true);
    setRole(loginRole);
    setStatus("✅ Giriş başarılı.");
  }

  function requireRoleWallet() {
    if (!connectedAddr) {
      setStatus("❌ Önce 'Cüzdanı Bağla' yap.");
      return false;
    }
    if (role !== "customer" && expectedAddr && lower(connectedAddr) !== lower(expectedAddr)) {
      setStatus(
        `❌ Yanlış MetaMask hesabı açık. Beklenen: ${shortAddr(expectedAddr)} | Açık: ${shortAddr(connectedAddr)}`
      );
      return false;
    }
    return true;
  }

  // --- ADMIN: register ---
  async function adminRegister(kind) {
    if (!contractWrite) return setStatus("❌ Kontrat bağlantısı yok. ABI / adres kontrol et.");
    if (!requireRoleWallet()) return;

    const addr = askAddress(`${ROLE_LABEL.admin} - ${kind} adresini gir:`, "");
    if (addr === null) return;
    if (!addr) return setStatus("❌ Adres boş olamaz.");
    if (!ethers.isAddress(addr)) return setStatus("❌ Geçersiz adres.");

    if (kind === "producer") {
      await runTx(contractWrite.registerProducer(addr), "Üretici eklendi.");
    } else if (kind === "transporter") {
      await runTx(contractWrite.registerTransporter(addr), "Taşıyıcı eklendi.");
    } else if (kind === "distributor") {
      await runTx(contractWrite.registerDistributor(addr), "Distribütör eklendi.");
    } else if (kind === "retailer") {
      await runTx(contractWrite.registerRetailer(addr), "Market eklendi.");
    }
    setAdminLastAdded(`${kind}: ${addr}`);
  }

  // --- PRODUCER: createBatch ---
  async function createBatch() {
    if (!contractWrite) return setStatus("❌ Kontrat bağlantısı yok. ABI / adres kontrol et.");
    if (!requireRoleWallet()) return;

    if (!batchId || !productName || !quantity) return setStatus("❌ Batch ID / Ürün / Miktar doldur.");
    const id = BigInt(batchId);
    const qty = BigInt(quantity);

    setCreatedBatchId("");
    await runTx(contractWrite.createBatch(id, productName, qty), "Batch oluşturuldu. QR üretildi.");
    setCreatedBatchId(String(batchId));
    setHistoryId(String(batchId));
  }

  // --- TRANSPORTER: addSensorData ---
  async function addSensor() {
    if (!contractWrite) return setStatus("❌ Kontrat bağlantısı yok. ABI / adres kontrol et.");
    if (!requireRoleWallet()) return;

    if (!tBatchId) return setStatus("❌ Batch ID gir.");
    const t = Number(temp);
    const h = Number(hum);
    if (Number.isNaN(t) || t < -10 || t > 40) return setStatus("❌ Sıcaklık -10 ile 40 arası olmalı.");
    if (Number.isNaN(h) || h < 0 || h > 40) return setStatus("❌ Nem 0 ile 40 arası olmalı.");
    if (!location.trim()) return setStatus("❌ Lokasyon boş olamaz.");

    await runTx(
      contractWrite.addSensorData(BigInt(tBatchId), BigInt(t), BigInt(h), location.trim()),
      "Sensör verisi eklendi."
    );
  }

  // --- TRANSFER: owner kontrolü ile ---
  async function transferOwnershipUI() {
    if (!contractWrite || !contractRead) return setStatus("❌ Kontrat bağlantısı yok. ABI / adres kontrol et.");
    if (!requireRoleWallet()) return;

    if (!xBatchId) return setStatus("❌ Batch ID gir.");
    if (!ethers.isAddress(toAddr)) return setStatus("❌ Hedef adres geçersiz.");

    try {
      const b = await contractRead.batches(BigInt(xBatchId));
      const currentOwner = b?.currentOwner || b?.[4];
      const exists = b?.exists ?? b?.[7];

      if (exists === false) return setStatus("❌ Bu Batch ID yok (exists=false).");
      if (lower(currentOwner) !== lower(connectedAddr)) {
        return setStatus(
          `❌ Bu batch'in sahibi sen değilsin. CurrentOwner: ${shortAddr(currentOwner)} | Sen: ${shortAddr(connectedAddr)}`
        );
      }
    } catch {
      return setStatus("❌ batches() okunamadı. ABI'yi kontrol et (batches view olmalı).");
    }

    await runTx(contractWrite.transferOwnership(BigInt(xBatchId), toAddr), "Sahiplik devri yapıldı.");
  }

  // --- RETAILER: markAsArrived ---
  async function markArrived() {
    if (!contractWrite) return setStatus("❌ Kontrat bağlantısı yok. ABI / adres kontrol et.");
    if (!requireRoleWallet()) return;
    if (!rBatchId) return setStatus("❌ Batch ID gir.");

    await runTx(contractWrite.markAsArrived(BigInt(rBatchId), passedInspection), "Market varış / kontrol kaydedildi.");
  }

  // --- CUSTOMER: getBatchHistory ---
  async function getHistory(idStr) {
    if (!idStr || String(idStr).trim() === "") return setStatus("❌ Lütfen Batch ID girin.");

    try {
      setBusy(true);
      setStatus("⏳ Geçmiş okunuyor...");
      setHistoryData(null);

      let c = contractRead;
      if (!c && window.ethereum) {
        const p = new ethers.BrowserProvider(window.ethereum);
        c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, p);
      }
      if (!c) throw new Error("Okuma için MetaMask gerekli.");

      const id = BigInt(idStr);
      const res = await c.getBatchHistory(id);

      const batch = res[0];
      const sensors = res[1] || [];
      const ownerships = res[2] || [];

      setHistoryData({
        batch: {
          batchId: batch.batchId?.toString?.() ?? String(batch.batchId),
          productName: batch.productName,
          quantity: batch.quantity?.toString?.() ?? String(batch.quantity),
          creator: batch.creator,
          currentOwner: batch.currentOwner,
        },
        sensors: sensors.map((s) => ({
          temperature: s.temperature?.toString?.() ?? String(s.temperature),
          humidity: s.humidity?.toString?.() ?? String(s.humidity),
          location: s.location,
          recordedBy: s.recordedBy,
        })),
        ownerships: ownerships.map((o) => ({ from: o.from, to: o.to })),
      });

      setStatus("✅ Geçmiş yüklendi.");
    } catch (e) {
      const msg =
        e?.shortMessage ||
        e?.info?.error?.message ||
        e?.reason ||
        e?.message ||
        "Okuma hatası";
      setStatus(`❌ ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  const qrValue = useMemo(() => {
    if (!createdBatchId) return "";
    return String(createdBatchId);
  }, [createdBatchId]);

  return (
    <div className="page">
      <h1 className="title">FreshChain Dashboard</h1>

      {!isLoggedIn ? (
        <div className="card">
          <h2 className="panelTitle">LOG IN</h2>
          <div className="form">
            <input className="input big" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Kullanıcı adı" />
            <input className="input big" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Şifre" type="password" />
            <select className="select big" value={loginRole} onChange={(e) => setLoginRole(e.target.value)}>
              <option value="admin">{ROLE_LABEL.admin}</option>
              <option value="producer">{ROLE_LABEL.producer}</option>
              <option value="transporter">{ROLE_LABEL.transporter}</option>
              <option value="distributor">{ROLE_LABEL.distributor}</option>
              <option value="retailer">{ROLE_LABEL.retailer}</option>
              <option value="customer">{ROLE_LABEL.customer}</option>
            </select>
            <button className="btn green wide" onClick={loginSubmit}>Giriş</button>
          </div>
        </div>
      ) : (
        <>
          <div className="topBar">
            <button className="btn dark" onClick={connectWallet} disabled={busy}>
              Cüzdanı Bağla
            </button>
            <div className="pill">
              {connectedAddr ? (
                <>✅ Bağlı Hesap: <span className="mono">{shortAddr(connectedAddr)}</span></>
              ) : (
                <>⛔ Bağlı değil</>
              )}
            </div>
          </div>

          <div className="card soft">
            <div className="roleRow">
              <div className="roleLeft">Sisteme Hangi Rol ile Gireceksiniz?</div>
              <select className="select big" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="admin">{ROLE_LABEL.admin}</option>
                <option value="producer">{ROLE_LABEL.producer}</option>
                <option value="transporter">{ROLE_LABEL.transporter}</option>
                <option value="distributor">{ROLE_LABEL.distributor}</option>
                <option value="retailer">{ROLE_LABEL.retailer}</option>
                <option value="customer">{ROLE_LABEL.customer}</option>
              </select>
            </div>
          </div>

          {role === "admin" && (
            <div className="card">
              <h2 className="panelTitle">Admin Paneli</h2>
              <div className="btnRow">
                <button className="btn dark" onClick={() => adminRegister("producer")} disabled={busy}>Üretici Ekle</button>
                <button className="btn dark" onClick={() => adminRegister("transporter")} disabled={busy}>Taşıyıcı Ekle</button>
                <button className="btn dark" onClick={() => adminRegister("distributor")} disabled={busy}>Distribütör Ekle</button>
                <button className="btn dark" onClick={() => adminRegister("retailer")} disabled={busy}>Market Ekle</button>
              </div>
              {adminLastAdded && <div className="muted">Son eklenen: <span className="mono">{adminLastAdded}</span></div>}
            </div>
          )}

          {role === "producer" && (
            <div className="card">
              <h2 className="panelTitle">Üretici Paneli</h2>
              <div className="form">
                <input className="input big" value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="Batch ID (örn: 101)" />
                <input className="input big" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Ürün adı (Tomatoes)" />
                <input className="input big" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Miktar (100)" />
                <button className="btn green wide" onClick={createBatch} disabled={busy}>
                  {busy ? "Onay bekleniyor..." : "Batch Oluştur & QR Üret"}
                </button>

                {createdBatchId && (
                  <div className="qrBox">
                    <div className="muted">QR (okutunca müşteri geçmiş sayfası açılır)</div>
                    <QRCodeCanvas value={`${window.location.origin}?batchId=${qrValue}`} size={180} />
                    <div className="mono">{`${window.location.origin}?batchId=${qrValue}`}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {role === "transporter" && (
            <div className="card">
              <h2 className="panelTitle">Taşıyıcı Paneli (Sensör)</h2>
              <div className="form">
                <input className="input big" value={tBatchId} onChange={(e) => setTBatchId(e.target.value)} placeholder="Batch ID" />
                <input className="input big" value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="Sıcaklık (°C)" />
                <input className="input big" value={hum} onChange={(e) => setHum(e.target.value)} placeholder="Nem (0-40)" />
                <input className="input big" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Şehir/Lokasyon (Bursa)" />
                <button className="btn green wide" onClick={addSensor} disabled={busy}>
                  {busy ? "Onay bekleniyor..." : "Sensör Verisi Ekle"}
                </button>
              </div>
            </div>
          )}

          {(role === "producer" || role === "transporter" || role === "distributor") && (
            <div className="card">
              <h2 className="panelTitle">
                {role === "producer" && "Üretici → Taşıyıcı (Transfer)"}
                {role === "transporter" && "Taşıyıcı → Distribütör (Transfer)"}
                {role === "distributor" && "Distribütör → Market (Transfer)"}
              </h2>

              <div className="form">
                <input className="input big" value={xBatchId} onChange={(e) => setXBatchId(e.target.value)} placeholder="Batch ID" />

                <select className="select big" value={toAddr} onChange={(e) => setToAddr(e.target.value)}>
                  {role === "producer" && <option value={ACCOUNTS.transporter}>Taşıyıcı ({shortAddr(ACCOUNTS.transporter)})</option>}
                  {role === "transporter" && <option value={ACCOUNTS.distributor}>Distribütör ({shortAddr(ACCOUNTS.distributor)})</option>}
                  {role === "distributor" && <option value={ACCOUNTS.retailer}>Market ({shortAddr(ACCOUNTS.retailer)})</option>}
                </select>

                <button className="btn green wide" onClick={transferOwnershipUI} disabled={busy}>
                  {busy ? "Onay bekleniyor..." : "Sahipliği Devret"}
                </button>
              </div>
            </div>
          )}

          {role === "retailer" && (
            <div className="card">
              <h2 className="panelTitle">Market Paneli</h2>
              <div className="form">
                <input className="input big" value={rBatchId} onChange={(e) => setRBatchId(e.target.value)} placeholder="Batch ID" />
                <select className="select big" value={passedInspection ? "yes" : "no"} onChange={(e) => setPassedInspection(e.target.value === "yes")}>
                  <option value="yes">✅ Kontrolden geçti</option>
                  <option value="no">❌ Reddedildi</option>
                </select>
                <button className="btn green wide" onClick={markArrived} disabled={busy}>
                  {busy ? "Onay bekleniyor..." : "Varış + Kontrol Kaydet"}
                </button>
              </div>
            </div>
          )}

          {role === "customer" && (
            <div className="card">
              <h2 className="panelTitle">Müşteri / Ürün Geçmişi</h2>
              <div className="historyRow">
                <input className="input big" value={historyId} onChange={(e) => setHistoryId(e.target.value)} placeholder="Batch ID" />
                <button className="btn green" onClick={() => getHistory(historyId)} disabled={busy}>
                  GET HISTORY
                </button>
              </div>

              {historyData && (
                <div className="historyBox">
                  <div className="histTitle">Batch Bilgisi</div>
                  <div className="kv"><span>ID:</span> <b>{historyData.batch.batchId}</b></div>
                  <div className="kv"><span>Ürün:</span> <b>{historyData.batch.productName}</b></div>
                  <div className="kv"><span>Miktar:</span> <b>{historyData.batch.quantity}</b></div>
                  <div className="kv"><span>Üretici:</span> <span className="mono">{shortAddr(historyData.batch.creator)}</span></div>
                  <div className="kv"><span>Mevcut Sahip:</span> <span className="mono">{shortAddr(historyData.batch.currentOwner)}</span></div>

                  <div className="histTitle">Sahiplik Kayıtları</div>
                  {historyData.ownerships.length === 0 ? (
                    <div className="muted">Kayıt yok.</div>
                  ) : (
                    <ul className="list">
                      {historyData.ownerships.map((o, i) => (
                        <li key={i}>
                          <span className="mono">{shortAddr(o.from)}</span> → <span className="mono">{shortAddr(o.to)}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="histTitle">Sensör Kayıtları</div>
                  {historyData.sensors.length === 0 ? (
                    <div className="muted">Kayıt yok.</div>
                  ) : (
                    <ul className="list">
                      {historyData.sensors.map((s, i) => (
                        <li key={i}>
                          <b>{s.temperature}°C</b> • <b>{s.humidity}</b> • {s.location} •{" "}
                          <span className="mono">{shortAddr(s.recordedBy)}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="histTitle">QR Kod</div>
                  <div className="qrBox">
                    <QRCodeCanvas value={`${window.location.origin}?batchId=${historyData.batch.batchId}`} size={180} />
                    <div className="muted">Telefonla okut → aynı ürün geçmişi açılır (MetaMask gerekmez).</div>
                    <div className="qrLink mono">{`${window.location.origin}?batchId=${historyData.batch.batchId}`}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {status && (
            <div className={`status ${status.startsWith("✅") ? "ok" : status.startsWith("⛓️") ? "mid" : "bad"}`}>
              {status}
            </div>
          )}
        </>
      )}
    </div>
  );
}
