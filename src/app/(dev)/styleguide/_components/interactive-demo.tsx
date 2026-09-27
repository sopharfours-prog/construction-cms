"use client";

import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** Client-side pieces of the styleguide: toasts, confirmation dialog, loading and theme. */
export function InteractiveDemo() {
  const [isSaving, setIsSaving] = useState(false);

  function simulateSave() {
    setIsSaving(true);
    window.setTimeout(() => {
      setIsSaving(false);
      toast.success("ບັນທຶກຂໍ້ມູນສຳເລັດ", { description: "Changes saved" });
    }, 900);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={simulateSave} disabled={isSaving}>
        {isSaving ? <Spinner /> : null}
        {isSaving ? "Saving…" : "Save changes"}
      </Button>

      <Button
        variant="outline"
        onClick={() =>
          toast.error("Couldn't save the project", {
            description: "Check the highlighted fields and try again.",
          })
        }
      >
        Show error toast
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">
            <Trash2Icon aria-hidden="true" />
            Delete project
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບຂໍ້ມູນນີ້?</AlertDialogTitle>
            <AlertDialogDescription>
              ການດຳເນີນການນີ້ບໍ່ສາມາດຍົກເລີກໄດ້.
              <span lang="en" className="mt-1 block">
                This can&apos;t be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep project</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => toast.success("Project deleted")}
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ThemeToggle labels={{ toDark: "Switch to dark theme", toLight: "Switch to light theme" }} />
    </div>
  );
}
