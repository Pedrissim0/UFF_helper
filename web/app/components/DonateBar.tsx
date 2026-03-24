"use client";

import { useState, useCallback } from "react";
import styles from "./DonateBar.module.css";

const QUICK_AMOUNTS = [500, 1000, 2500]; // centavos: R$5, R$10, R$25

interface Props {
  totalCents: number;
  monthlyCostCents: number;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function DonateBar({ totalCents, monthlyCostCents }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const monthsActive = monthlyCostCents > 0 ? totalCents / monthlyCostCents : 0;
  const monthsDisplay =
    monthsActive >= 1
      ? `${Math.floor(monthsActive)} ${Math.floor(monthsActive) === 1 ? "mês" : "meses"}`
      : monthsActive > 0
        ? `${(monthsActive * 30).toFixed(0)} dias`
        : "0 meses";
  const progressPct = Math.min(100, (monthsActive / 12) * 100);

  const isCustom = !QUICK_AMOUNTS.includes(selectedAmount);

  const handleDonate = useCallback(async () => {
    const amount = isCustom
      ? Math.round(parseFloat(customAmount.replace(",", ".")) * 100)
      : selectedAmount;

    if (!amount || amount < 100) {
      setError("Valor mínimo: R$1,00.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          donorName: donorName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao processar doação.");
        setLoading(false);
        return;
      }

      // Redirect to AbacatePay checkout
      window.location.href = data.url;
    } catch {
      setError("Erro de conexão.");
      setLoading(false);
    }
  }, [selectedAmount, customAmount, donorName, isCustom]);

  return (
    <>
      <div className={styles.bar}>
        <div className={styles.barInner}>
          <div className={styles.progressSection}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
            <span className={styles.progressLabel}>
              {totalCents > 0
                ? `${monthsDisplay} de projeto na ativa`
                : "Ajude a manter o projeto no ar"}
            </span>
          </div>
          <button className={styles.donateBtn} onClick={() => setModalOpen(true)}>
            Apoiar o projeto
          </button>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => !loading && setModalOpen(false)}
        >
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Apoiar o projeto</span>
              <button
                className={styles.closeBtn}
                onClick={() => setModalOpen(false)}
                disabled={loading}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <p className={styles.modalDesc}>
              Sua doação via Pix ajuda a manter o servidor e o desenvolvimento ativo.
              Qualquer valor faz diferença!
            </p>

            {/* Quick amounts */}
            <div className={styles.amountRow}>
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  className={`${styles.amountBtn} ${selectedAmount === amt && !isCustom ? styles.amountBtnActive : ""}`}
                  onClick={() => {
                    setSelectedAmount(amt);
                    setCustomAmount("");
                    setError("");
                  }}
                >
                  {formatBRL(amt)}
                </button>
              ))}
              <button
                className={`${styles.amountBtn} ${isCustom ? styles.amountBtnActive : ""}`}
                onClick={() => {
                  setSelectedAmount(0);
                  setError("");
                }}
              >
                Outro
              </button>
            </div>

            {/* Custom amount input */}
            {isCustom && (
              <div className={styles.customRow}>
                <span className={styles.currencyPrefix}>R$</span>
                <input
                  className={styles.customInput}
                  type="text"
                  inputMode="decimal"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setError("");
                  }}
                  placeholder="0,00"
                  autoFocus
                />
              </div>
            )}

            {/* Donor name (optional) */}
            <input
              className={styles.nameInput}
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Seu nome (opcional)"
              maxLength={60}
            />

            {error && <p className={styles.errorMsg}>{error}</p>}

            <button
              className={styles.submitBtn}
              onClick={handleDonate}
              disabled={loading}
            >
              {loading ? "Redirecionando..." : "Doar via Pix"}
            </button>

            <p className={styles.footerNote}>
              Pagamento seguro via AbacatePay. Você será redirecionado.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
