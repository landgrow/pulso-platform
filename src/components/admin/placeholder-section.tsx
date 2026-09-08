import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlaceholderSectionProps {
  title: string;
  epic: string;
  description: string;
  icon?: LucideIcon;
}

/**
 * Seção "em construção" honesta — usada nas partes do painel do cliente que
 * ainda não têm dado real por trás (Atividades, Métricas, Mapa Mental).
 * Deliberado: não inventa gráfico nem número fake só pra preencher espaço.
 */
export function PlaceholderSection({
  title,
  epic,
  description,
  icon: Icon = Construction,
}: PlaceholderSectionProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-text-2" />
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant="outline" className="text-text-2">
            {epic}
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="py-10 text-center">
        <p className="text-sm text-text-2">
          Em construção — ainda não há dados reais aqui.
        </p>
      </CardContent>
    </Card>
  );
}
