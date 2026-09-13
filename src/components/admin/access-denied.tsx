import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function AccessDenied({ message }: { message: string }): JSX.Element {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
          <h1 className="text-xl font-semibold mb-2">Acesso negado</h1>
          <p className="text-text-2 text-sm">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}
