#!/usr/bin/env python3
"""Embute as logos (base64) numa página HTML baseada em assets/template.html e valida o resultado.

Uso:
    python scripts/embed_logos.py pagina.html pagina_final.html

Substitui:
    {{LOGO_SUPERMARKET}}  -> assets/logo_supermarket.png (cabeçalho)
    {{LOGO_ABB}}          -> assets/logo_adilson_baptista.jpeg (rodapé)
    {{DATA_GERACAO}}      -> "Gerado em dd/mm/aaaa" (data de hoje)

Falha (código 1) se sobrar placeholder {{...}} ou se a logo Adilson Baptista
não estiver no rodapé, depois de todo o conteúdo da página.
"""
import base64
import datetime
import mimetypes
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
LOGOS = {
    "{{LOGO_SUPERMARKET}}": RAIZ / "assets" / "logo_supermarket.png",
    "{{LOGO_ABB}}": RAIZ / "assets" / "logo_adilson_baptista.jpeg",
}


def data_uri(caminho: pathlib.Path) -> str:
    tipo = mimetypes.guess_type(caminho.name)[0] or "application/octet-stream"
    return f"data:{tipo};base64," + base64.b64encode(caminho.read_bytes()).decode()


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    origem, destino = map(pathlib.Path, sys.argv[1:])
    html = origem.read_text(encoding="utf-8")

    for marcador, arquivo in LOGOS.items():
        html = html.replace(marcador, data_uri(arquivo))
    html = html.replace("{{DATA_GERACAO}}", "Gerado em " + datetime.date.today().strftime("%d/%m/%Y"))

    erros = []
    sobras = re.findall(r"\{\{[A-Z_]+\}\}", html)
    if sobras:
        erros.append(f"placeholders sem preencher: {sorted(set(sobras))}")

    corpo = html.split("<body", 1)[-1]
    if "Adilson Baptista" not in corpo or "assinatura" not in corpo:
        erros.append("a logo Adilson Baptista (img.assinatura) não está na página")
    else:
        # a logo precisa vir depois de </main> (ou seja, no fim da página)
        if corpo.rfind("</main>") > corpo.rfind('class="assinatura"'):
            erros.append("a logo Adilson Baptista está antes do conteúdo; ela deve ser o último bloco da página")

    if erros:
        print("ERRO:\n- " + "\n- ".join(erros))
        return 1

    destino.write_text(html, encoding="utf-8")
    print(f"OK: {destino} ({destino.stat().st_size / 1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
