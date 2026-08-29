import { describe, it, expect } from 'vitest';
import { parseBulkProducts, categoryLeaf, MAX_PRODUCTS_PER_FILE } from './product-parser';

describe('bulk product file parser', () => {
  it('parses a basic block with all single-line fields', () => {
    const { products, issues } = parseBulkProducts(`---
name: Beaded Sandals
price: 30000
stock: 5
brand: Lyn-nyx
category: Shoes
tags: summer, leather
featured: yes
published: no
`);
    expect(issues).toHaveLength(0);
    expect(products).toHaveLength(1);
    expect(products[0].errors).toHaveLength(0);
    expect(products[0].data.name).toBe('Beaded Sandals');
    expect(products[0].data.price).toBe('30000');
    expect(products[0].data.tags).toBe('summer, leather');
  });

  it('collects multiline description until the next field', () => {
    const { products } = parseBulkProducts(`---
name: Dress
price: 1000
description: |
  First line of the story.
  Second line, still description.

seo_title: Buy Dress
`);
    expect(products[0].errors).toHaveLength(0);
    expect(products[0].data.description).toBe('First line of the story.\nSecond line, still description.');
    expect(products[0].data.seo_title).toBe('Buy Dress');
  });

  it('keeps features as newline-separated list', () => {
    const { products } = parseBulkProducts(`---
name: Chair
price: 5000
features: |
  Wooden frame
  Hand carved

  Holds up to 120kg
`);
    expect(products[0].errors).toHaveLength(0);
    expect(products[0].data.features).toBe('Wooden frame\nHand carved\n\nHolds up to 120kg');
  });

  it('preserves interior blank lines inside a | section (pdtguide)', () => {
    const { products } = parseBulkProducts(`---
name: Dress
price: 1000
description: |
  Line one.

  Line three after a blank.

  End after an empty spacer.
`);
    expect(products[0].errors).toHaveLength(0);
    expect(products[0].data.description).toBe('Line one.\n\nLine three after a blank.\n\nEnd after an empty spacer.');
  });

  it('trailing blank lines are trimmed from a | section', () => {
    const { products } = parseBulkProducts(`---
name: Dress
price: 1000
description: |
  Text.

`);
    expect(products[0].data.description).toBe('Text.');
  });

  it('blank spacer lines inside specs do not fail Label: Value validation', () => {
    const { products } = parseBulkProducts(`---
name: Shirt
price: 9000
specs: |
  Material: Cotton

  Fit: Slim
`);
    expect(products[0].errors).toHaveLength(0);
    expect(products[0].data.specs).toEqual(['Material: Cotton', 'Fit: Slim']);
  });

  it('a | section closes when the next field is also multiline (pdtguide worked example)', () => {
    const { products } = parseBulkProducts(`---
name: African Print Dress
price: 45000
description: |
  Handmade African print dress tailored in Kampala.
features: |
  100% cotton
  Handmade in Uganda
specs: |
  Material: Cotton
  Care: Machine wash cold
`);
    expect(products[0].errors).toHaveLength(0);
    expect(products[0].data.description).toBe('Handmade African print dress tailored in Kampala.');
    expect(products[0].data.features).toBe('100% cotton\nHandmade in Uganda');
    expect(products[0].data.specs).toEqual(['Material: Cotton', 'Care: Machine wash cold']);
  });

  it('categoryLeaf keeps only the segment after the last >', () => {
    expect(categoryLeaf('Dresses')).toBe('Dresses');
    expect(categoryLeaf('Women > Dresses')).toBe('Dresses');
    expect(categoryLeaf('  Men > Clothing > Trousers  ')).toBe('Trousers');
    expect(categoryLeaf('Women >')).toBe('');
    expect(categoryLeaf('')).toBe('');
  });

  it('validates specs lines need Label: Value format', () => {
    const { products } = parseBulkProducts(`---
name: Shirt
price: 9000
specs: |
  Material: Cotton
  just some text without colon
`);
    expect(products[0].errors.some((e) => e.field === 'specs' && e.message.includes('"Label: Value"'))).toBe(true);
  });

  it('flags missing name and price as per-product errors', () => {
    const { products } = parseBulkProducts(`---
price: abc
---
name: No price here
`);
    expect(products).toHaveLength(2);
    expect(products[0].errors.some((e) => e.field === 'name' && /required/.test(e.message))).toBe(true);
    expect(products[0].errors.some((e) => e.field === 'price' && /not a number/.test(e.message))).toBe(true);
    expect(products[1].errors.some((e) => e.field === 'price' && /required/.test(e.message))).toBe(true);
  });

  it('rejects bad booleans but accepts yes/no/true/false/1/0', () => {
    const { products } = parseBulkProducts(`---
name: A
price: 10
featured: maybe
new: TRUE
track_inventory: 0
`);
    expect(products[0].errors.some((e) => e.field === 'featured')).toBe(true);
    expect(products[0].errors.filter((e) => e.field === 'new' || e.field === 'track_inventory')).toHaveLength(0);
  });

  it('warns on unknown fields instead of failing', () => {
    const { products } = parseBulkProducts(`---
name: A
price: 10
colour_blu: whatever
`);
    expect(products[0].errors).toHaveLength(0);
    expect(products[0].warnings.some((w) => w.field === 'colour_blu')).toBe(true);
  });

  it('ignores comments and blank lines; reports stray text as errors', () => {
    const { products, issues } = parseBulkProducts(`# my product batch
---
name: A
price: 10

random stray line here
---
`);
    expect(issues).toHaveLength(0);
    expect(products).toHaveLength(1);
    expect(products[0].errors.some((e) => e.message.includes('Not a valid line'))).toBe(true);
  });

  it('reports empty files and enforces the product cap', () => {
    const empty = parseBulkProducts('# nothing here');
    expect(empty.products).toHaveLength(0);
    expect(empty.issues.some((i) => /No products found/.test(i.message))).toBe(true);

    const many = Array.from({ length: MAX_PRODUCTS_PER_FILE + 1 }, (_, i) => `---\nname: P${i}\nprice: ${i + 1}`).join('\n');
    const capped = parseBulkProducts(many);
    expect(capped.issues.some((i) => /maximum is/.test(i.message))).toBe(true);
  });

  it('handles CRLF line endings and multiple blocks', () => {
    const { products } = parseBulkProducts('---\r\nname: One\r\nprice: 1\r\n---\r\nname: Two\r\nprice: 2\r\n');
    expect(products).toHaveLength(2);
    expect(products.map((p) => p.data.name)).toEqual(['One', 'Two']);
  });
});
