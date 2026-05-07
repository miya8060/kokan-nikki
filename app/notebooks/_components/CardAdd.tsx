"use client";

import styles from "../notebooks.module.css";

export function CardAdd() {
  // 「あたらしく つくる」点線カード: クリックで composer の input にフォーカス
  // しつつ、画面外なら scrollIntoView で composer まで戻す。
  const handleClick = () => {
    const input = document.getElementById("diary-name") as HTMLInputElement | null;
    if (!input) return;
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
  };

  return (
    <button type="button" className={styles.cardAdd} onClick={handleClick}>
      <span className={styles.cardAddPlus} aria-hidden="true">＋</span>
      <span className={styles.cardAddLabel}>あたらしく つくる</span>
      <span className={styles.cardAddSub}>なまえを いれてね ♡</span>
    </button>
  );
}
