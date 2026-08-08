const IMAGE_MAP = [
  // Frutas
  { keywords: ['manzana verde'], url: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=500&q=80' },
  { keywords: ['manzana roja', 'manzana'], url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&q=80' },
  { keywords: ['banana', 'platano'], url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&q=80' },
  { keywords: ['pera'], url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&q=80' },
  { keywords: ['limon', 'limón'], url: 'https://images.unsplash.com/photo-1534531141161-e4db2492163b?w=500&q=80' },
  { keywords: ['pomelo'], url: 'https://images.unsplash.com/photo-1577234286642-fc512a5f8f11?w=500&q=80' },
  { keywords: ['naranja'], url: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=500&q=80' },
  { keywords: ['mandarina', 'clementina'], url: 'https://images.unsplash.com/photo-1557800636-894a64c1696f?w=500&q=80' },
  { keywords: ['palta', 'aguacate'], url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=500&q=80' },
  { keywords: ['frutilla', 'frutillas', 'fresa'], url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=500&q=80' },
  { keywords: ['uva'], url: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=500&q=80' },
  { keywords: ['arandano', 'arándano'], url: 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=500&q=80' },
  { keywords: ['durazno', 'melocoton'], url: 'https://images.unsplash.com/photo-1595126730719-197e415e9821?w=500&q=80' },
  { keywords: ['ciruela'], url: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=500&q=80' },
  { keywords: ['sandia', 'sandía'], url: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=500&q=80' },
  { keywords: ['melon', 'melón'], url: 'https://images.unsplash.com/photo-1571575173700-afb9492e6a50?w=500&q=80' },

  // Verduras y Hortalizas
  { keywords: ['brocoli', 'brócoli'], url: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=500&q=80' },
  { keywords: ['rucula', 'rúcula'], url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80' },
  { keywords: ['acelga'], url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&q=80' },
  { keywords: ['espinaca'], url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&q=80' },
  { keywords: ['remolacha'], url: 'https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?w=500&q=80' },
  { keywords: ['lechuga'], url: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=500&q=80' },
  { keywords: ['cebolla verde', 'verdeo', 'cebollin'], url: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&q=80' },
  { keywords: ['albahaca'], url: 'https://images.unsplash.com/photo-1608683286392-491d96001a18?w=500&q=80' },
  { keywords: ['perejil'], url: 'https://images.unsplash.com/photo-1628543108325-24e5ef906660?w=500&q=80' },
  { keywords: ['apio'], url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&q=80' },
  { keywords: ['repollo'], url: 'https://images.unsplash.com/photo-1598170845058-12ef4a457c3b?w=500&q=80' },
  { keywords: ['puerro'], url: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&q=80' },
  { keywords: ['batata', 'camote'], url: 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=500&q=80' },
  { keywords: ['papa', 'patata'], url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&q=80' },
  { keywords: ['cebolla morada'], url: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&q=80' },
  { keywords: ['cebolla'], url: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&q=80' },
  { keywords: ['pepino'], url: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=500&q=80' },
  { keywords: ['zanahoria'], url: 'https://images.unsplash.com/photo-1598170845058-12ef4a457c3b?w=500&q=80' },
  { keywords: ['ajo'], url: 'https://images.unsplash.com/photo-1608670119864-16f3938596ee?w=500&q=80' },
  { keywords: ['pimiento verde', 'morron verde'], url: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=500&q=80' },
  { keywords: ['morron', 'morrón', 'pimiento'], url: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=500&q=80' },
  { keywords: ['tomate perita', 'tomate redondo', 'tomate'], url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&q=80' },
  { keywords: ['berenjena'], url: 'https://images.unsplash.com/photo-1613881553903-4dad5935306a?w=500&q=80' },
  { keywords: ['zapallo', 'calabaza', 'anco'], url: 'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=500&q=80' },
  { keywords: ['zapallito', 'zucchini'], url: 'https://images.unsplash.com/photo-1590403362149-16629910d635?w=500&q=80' },
  { keywords: ['choclo', 'maiz'], url: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=500&q=80' },

  // Almacén / Huevos / Carbón
  { keywords: ['huevo', 'huevos', 'maple'], url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&q=80' },
  { keywords: ['carbon', 'carbón', 'leña'], url: 'https://images.unsplash.com/photo-1542332213-9b5a5a3fad35?w=500&q=80' }
];

export function getProductImage(product) {
  if (product && product.imagen && typeof product.imagen === 'string' && product.imagen.trim() !== '') {
    return product.imagen;
  }
  const name = (product?.nombre || '').toLowerCase();
  for (const item of IMAGE_MAP) {
    if (item.keywords.some(kw => name.includes(kw))) {
      return item.url;
    }
  }
  // Default fresh produce basket background fallback
  return 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=500&q=80';
}
