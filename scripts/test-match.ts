const THEMATIC = [
  'agricole', 'agriculture', 'transition écologique', 'industrie verte', 'prêt vert', 'vert', 'écologique'
];

const subsidyText = 'prêt industrie verte financer les projets de transition écologique et énergétique des pme et eti industrielles';

console.log('Subsidy text:', subsidyText);
console.log('\nTesting each keyword:');
for (const kw of THEMATIC) {
  const found = subsidyText.includes(kw.toLowerCase());
  console.log(`  "${kw}" → ${found ? '✓ FOUND' : '✗ not found'}`);
}

const matches = THEMATIC.filter(kw => subsidyText.includes(kw.toLowerCase()));
console.log('\nTotal matches:', matches.length);
console.log('Matched:', matches);
