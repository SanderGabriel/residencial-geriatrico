import { useState, type ReactNode } from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Aguarde…' : confirmLabel}
          </Button>
        </>
      }
    >
      {description && <div className="text-sm text-slate-700">{description}</div>}
    </Dialog>
  );
}

/**
 * Hook ergonômico para usar ConfirmDialog: retorna [render, ask].
 *   const [confirmNode, askConfirm] = useConfirm();
 *   ...
 *   await askConfirm({ title: 'Excluir?', destructive: true });
 *   if (await askConfirm({...})) doDelete();
 */
export function useConfirm() {
  const [state, setState] = useState<
    | (Omit<ConfirmDialogProps, 'open' | 'onClose' | 'onConfirm'> & {
        resolve: (ok: boolean) => void;
      })
    | null
  >(null);

  const ask = (opts: Omit<ConfirmDialogProps, 'open' | 'onClose' | 'onConfirm'>) =>
    new Promise<boolean>((resolve) => setState({ ...opts, resolve }));

  const node = (
    <ConfirmDialog
      open={state !== null}
      onClose={() => {
        state?.resolve(false);
        setState(null);
      }}
      onConfirm={() => {
        state?.resolve(true);
        setState(null);
      }}
      title={state?.title ?? ''}
      description={state?.description}
      confirmLabel={state?.confirmLabel}
      cancelLabel={state?.cancelLabel}
      destructive={state?.destructive}
    />
  );

  return [node, ask] as const;
}
