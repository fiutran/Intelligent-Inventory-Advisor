interface AddScreenProps {
  onConfirm: () => void;
}

export function AddScreen({ onConfirm }: AddScreenProps) {
  return (
    <section className="screen fade">
      <div className="eyebrow">Add to inventory</div>
      <div className="shot">
        <div className="cam">📷</div>
        <div className="h">Point at the item or its box</div>
        <div className="s">
          I&apos;ll read the model and pull the specs. You confirm the thin parts.
        </div>
      </div>
      <div style={{ marginTop: 6 }}>
        <div className="field">
          <label>Identity</label>
          <div className="fv">
            <span>Anker 65W USB-C charger</span>
            <span className="conf hi">High</span>
          </div>
        </div>
        <div className="field">
          <label>Specs</label>
          <div className="fv">
            <span>65 W · GaN · 3 ports</span>
            <span className="conf md">Medium</span>
          </div>
        </div>
        <div className="field">
          <label>Owned since</label>
          <div className="fv">
            <span>~ Mar 2024</span>
            <span className="conf lo">Guess</span>
          </div>
        </div>
        <div className="guessnote">
          A photo can&apos;t know when you got it. I guessed from the photo date — tap to
          correct, or forward the receipt and I&apos;ll set it exactly.
        </div>
        <button type="button" className="btn primary" style={{ marginTop: 14 }} onClick={onConfirm}>
          <span>Confirm and save</span>
        </button>
      </div>
    </section>
  );
}
