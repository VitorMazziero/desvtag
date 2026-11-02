// Notas de versão formatadas no aviso de atualização (ET14-T09): títulos, listas, tabelas, negrito,
// código e links https, em uma região rolável. Nenhum HTML das notas é interpretado.
import { type Block, type Inline, parseNotes } from "./notesMarkdown";

function Inlines({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((item, i) => {
        const key = `${i}-${item.type}`;
        if (item.type === "bold") return <strong key={key}>{item.text}</strong>;
        if (item.type === "code") return <code key={key}>{item.text}</code>;
        if (item.type === "link")
          return (
            <a key={key} href={item.href} target="_blank" rel="noopener noreferrer">
              {item.text}
            </a>
          );
        return <span key={key}>{item.text}</span>;
      })}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return block.level === 3 ? (
        <h4>
          <Inlines items={block.inlines} />
        </h4>
      ) : (
        <h5>
          <Inlines items={block.inlines} />
        </h5>
      );
    case "paragraph":
      return (
        <p>
          <Inlines items={block.inlines} />
        </p>
      );
    case "quote":
      return (
        <blockquote>
          <Inlines items={block.inlines} />
        </blockquote>
      );
    case "list":
      return (
        <ul>
          {block.items.map((item, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: itens de uma lista estática de texto.
            <li key={i}>
              <Inlines items={item} />
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="grid-scroll">
          <table className="results-table">
            <thead>
              <tr>
                {block.header.map((cell, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: colunas de uma tabela estática.
                  <th key={i} scope="col">
                    <Inlines items={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: linhas de uma tabela estática.
                <tr key={r}>
                  {row.map((cell, c) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: células de uma tabela estática.
                    <td key={c}>
                      <Inlines items={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export function ReleaseNotes({ markdown, label }: { markdown: string; label: string }) {
  const blocks = parseNotes(markdown);
  if (blocks.length === 0) return null;
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: região rolável precisa ser alcançável pelo teclado.
    <section className="release-notes" aria-label={label} tabIndex={0} data-testid="release-notes">
      {blocks.map((block, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: blocos de texto estático, sem identidade.
        <BlockView key={i} block={block} />
      ))}
    </section>
  );
}
