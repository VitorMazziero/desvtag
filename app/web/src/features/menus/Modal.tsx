// Janela modal (ET29) sobre o elemento `<dialog>` nativo: o foco fica preso na janela, Esc fecha e o
// foco volta a quem a abriu. Usada pelas ferramentas do menu «Extras».
import { type ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  testId: string;
  children: ReactNode;
}

export function Modal({ open, title, onClose, testId, children }: Props) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open) {
      if (el.open) el.close();
      return;
    }
    const overflow = document.body.style.overflow;
    const padding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = padding;
    };
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="modal"
      data-testid={testId}
      aria-labelledby={`${testId}-title`}
      onClose={onClose}
      onCancel={onClose}
    >
      {open && (
        <>
          <div className="modal-head">
            <h2 id={`${testId}-title`}>{title}</h2>
            <button type="button" className="button secondary small" onClick={onClose}>
              {t("menus.close")}
            </button>
          </div>
          <div className="modal-body">{children}</div>
        </>
      )}
    </dialog>
  );
}
