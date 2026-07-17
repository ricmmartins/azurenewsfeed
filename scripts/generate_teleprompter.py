#!/usr/bin/env python3
"""
Azure News Feed - Teleprompter Script Generator
Generates a daily video script in Brazilian Portuguese from the feeds.json data.
Designed to be read from a teleprompter for YouTube videos.
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from collections import defaultdict


def load_todays_articles(feeds_path="data/feeds.json", days_back=1):
    """Load articles from the last N days."""
    with open(feeds_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days_back)).isoformat()
    articles = [
        a for a in data.get("articles", [])
        if a.get("published", "") >= cutoff
    ]
    return articles


def group_by_category(articles):
    """Group articles by blog/category."""
    groups = defaultdict(list)
    for article in articles:
        groups[article.get("blog", "Geral")].append(article)
    return dict(groups)


def generate_script_with_ai(articles, grouped):
    """Generate teleprompter script using GitHub Models API or OpenAI."""
    github_token = os.environ.get("GITHUB_TOKEN", "")
    openai_key = os.environ.get("OPENAI_API_KEY", "")

    if not github_token and not openai_key:
        print("Nenhum GITHUB_TOKEN ou OPENAI_API_KEY configurado. Gerando script básico...")
        return generate_basic_script(articles, grouped)

    try:
        import openai

        today_str = datetime.now(timezone.utc).strftime("%d de %B de %Y")
        articles_text = ""
        for blog, items in grouped.items():
            articles_text += f"\n## {blog}\n"
            for item in items[:5]:
                articles_text += f"- {item['title']}: {item['summary'][:200]}\n"

        prompt = f"""Você é um apresentador de um canal de YouTube sobre Azure e Cloud Computing.
Gere um roteiro completo em português brasileiro para um vídeo diário de atualizações do Azure.

Data: {today_str}
Total de atualizações: {len(articles)}

Artigos do dia:
{articles_text}

REGRAS DO ROTEIRO:
1. Use linguagem conversacional mas profissional
2. Frases curtas (máximo 15 palavras por frase) para facilitar leitura no teleprompter
3. Marque pausas com [PAUSA]
4. Marque ênfases com **palavra**
5. Agrupe por tema/categoria
6. Inclua abertura cumprimentando o público
7. Inclua encerramento pedindo like e inscrição
8. Para cada atualização, explique brevemente O QUE mudou e POR QUE é relevante
9. Use analogias simples quando possível
10. Duração alvo: 5-8 minutos de leitura (aproximadamente 800-1200 palavras)

FORMATO:
---
[ABERTURA]
(texto da abertura)

[PAUSA]

[BLOCO: Nome da Categoria]
(atualizações dessa categoria)

[PAUSA]

[ENCERRAMENTO]
(texto do encerramento)
---

Gere o roteiro completo:"""

        if github_token:
            client = openai.OpenAI(
                base_url="https://models.inference.ai.azure.com",
                api_key=github_token,
            )
            print("Usando GitHub Models API...")
        else:
            client = openai.OpenAI(api_key=openai_key)
            print("Usando OpenAI API...")

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=3000,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"Erro ao gerar com IA: {e}")
        print("Gerando script básico...")
        return generate_basic_script(articles, grouped)


def generate_basic_script(articles, grouped):
    """Generate a basic teleprompter script without AI."""
    today_str = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    lines = []

    lines.append("=" * 60)
    lines.append(f"ROTEIRO - AZURE NEWS DIÁRIO - {today_str}")
    lines.append("=" * 60)
    lines.append("")
    lines.append("[ABERTURA]")
    lines.append("")
    lines.append("E aí pessoal, tudo bem?")
    lines.append("[PAUSA]")
    lines.append(f"Bem-vindos a mais um Azure News Diário.")
    lines.append(f"Hoje é dia {today_str}.")
    lines.append(f"Temos {len(articles)} atualizações para cobrir.")
    lines.append("Vamos direto ao ponto.")
    lines.append("[PAUSA]")
    lines.append("")

    for blog, items in grouped.items():
        lines.append("-" * 40)
        lines.append(f"[BLOCO: {blog}]")
        lines.append("")
        for item in items[:5]:
            lines.append(f"  ► {item['title']}")
            if item.get("summary"):
                summary = item["summary"][:150]
                lines.append(f"    {summary}")
            lines.append(f"    Link: {item.get('link', '')}")
            lines.append("")
        lines.append("[PAUSA]")
        lines.append("")

    lines.append("-" * 40)
    lines.append("[ENCERRAMENTO]")
    lines.append("")
    lines.append("E essas foram as novidades de hoje.")
    lines.append("[PAUSA]")
    lines.append("Se esse conteúdo te ajudou,")
    lines.append("deixa o like e se inscreve no canal.")
    lines.append("[PAUSA]")
    lines.append("Nos vemos amanhã com mais atualizações.")
    lines.append("Valeu pessoal, até a próxima!")
    lines.append("")
    lines.append("=" * 60)

    return "\n".join(lines)


def save_script(script, output_dir="data/teleprompter"):
    """Save the script to a dated file."""
    os.makedirs(output_dir, exist_ok=True)
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"roteiro-{today_str}.md"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(script)

    # Also save as 'latest.md' for easy access
    latest_path = os.path.join(output_dir, "latest.md")
    with open(latest_path, "w", encoding="utf-8") as f:
        f.write(script)

    return filepath


def main():
    print("=" * 60)
    print("Azure News - Gerador de Roteiro para Teleprompter")
    print("=" * 60)

    feeds_path = "data/feeds.json"
    if not os.path.exists(feeds_path):
        print(f"Erro: {feeds_path} não encontrado.")
        print("Execute primeiro: python scripts/fetch_feeds.py")
        sys.exit(1)

    days_back = int(os.environ.get("DAYS_BACK", "1"))
    print(f"\nBuscando artigos dos últimos {days_back} dia(s)...")

    articles = load_todays_articles(feeds_path, days_back=days_back)
    if not articles:
        print("Nenhum artigo encontrado para o período.")
        print("Tente aumentar DAYS_BACK=2 ou verifique se o feed foi atualizado.")
        sys.exit(0)

    print(f"Encontrados {len(articles)} artigos.")

    grouped = group_by_category(articles)
    print(f"Categorias: {', '.join(grouped.keys())}")
    print("\nGerando roteiro...")

    script = generate_script_with_ai(articles, grouped)

    filepath = save_script(script)
    print(f"\n{'=' * 60}")
    print(f"Roteiro salvo em: {filepath}")
    print(f"Também disponível em: data/teleprompter/latest.md")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
