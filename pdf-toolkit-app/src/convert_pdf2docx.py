#!/usr/bin/env python3
"""
PDF → Word (DOCX) conversion locale via pdf2docx.
Usage : python convert_pdf2docx.py <input.pdf> <output.docx>
Exit code 0 = succès, sinon erreur sur stderr.
"""
import sys
import os

def main():
    if len(sys.argv) != 3:
        print("Usage: convert_pdf2docx.py <input.pdf> <output.docx>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.isfile(input_path):
        print(f"Erreur : fichier introuvable : {input_path}", file=sys.stderr)
        sys.exit(1)

    try:
        from pdf2docx import Converter
    except ImportError:
        print("Erreur : pdf2docx n'est pas installé. Exécute : pip install pdf2docx", file=sys.stderr)
        sys.exit(2)

    try:
        cv = Converter(input_path)
        cv.convert(output_path)
        cv.close()
        print("OK")
    except Exception as e:
        print(f"Erreur de conversion : {e}", file=sys.stderr)
        sys.exit(3)

if __name__ == "__main__":
    main()
