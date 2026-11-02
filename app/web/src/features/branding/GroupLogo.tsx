// Logo do grupo de pesquisa (marca EnziTAG), empacotado localmente (funciona offline). O arquivo
// não é alterado nem recolorido: uma base clara neutra o mantém legível em todos os temas.
import { useTranslation } from "react-i18next";
import logo from "../../assets/enzitag-logo.png";

const SIZES = { header: [108, 30] } as const;

export function GroupLogo({ size = "header" }: { size?: keyof typeof SIZES }) {
  const { t } = useTranslation();
  const [width, height] = SIZES[size];
  return (
    <img
      className={`group-logo group-logo-${size}`}
      src={logo}
      width={width}
      height={height}
      alt={t("app.logoAlt")}
      data-testid={`group-logo-${size}`}
    />
  );
}
