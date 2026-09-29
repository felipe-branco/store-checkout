'use client'

import { Button } from '../components/shadcn/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '../components/shadcn/alert-dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent className="flex max-w-lg flex-col gap-6 rounded-4xl p-10 data-[size=default]:max-w-lg data-[size=default]:sm:max-w-lg">
        <AlertDialogTitle className="font-display text-4xl font-bold text-balance">{title}</AlertDialogTitle>
        <AlertDialogDescription className="text-xl leading-relaxed text-muted-foreground text-pretty">
          {description}
        </AlertDialogDescription>
        <div className="flex flex-col gap-3">
          {/* The safe option is the big, primary one: an accidental tap should never destroy the order. */}
          <Button onClick={onCancel} className="h-20 rounded-full font-display text-2xl font-bold" autoFocus>
            {cancelLabel}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="h-16 rounded-full text-lg font-semibold"
          >
            {confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
