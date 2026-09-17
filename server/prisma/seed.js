const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const sampleUnits = [
  { brand: 'Dell', model: 'Latitude 5520', specs: { cpu: 'Intel i5-1145G7', ram: '16GB', storage: '256GB SSD' }, grade: 'A', price: 499.99, supplier: 'TechRecycle Co' },
  { brand: 'Lenovo', model: 'ThinkPad T480', specs: { cpu: 'Intel i5-8250U', ram: '8GB', storage: '256GB SSD' }, grade: 'B', price: 329.99, supplier: 'ReFurb Direct' },
  { brand: 'HP', model: 'EliteBook 840 G7', specs: { cpu: 'Intel i5-10310U', ram: '16GB', storage: '512GB SSD' }, grade: 'A', price: 549.99, supplier: 'TechRecycle Co' },
  { brand: 'Dell', model: 'Latitude 7400', specs: { cpu: 'Intel i7-8665U', ram: '16GB', storage: '512GB SSD' }, grade: 'A', price: 579.99, supplier: 'GreenIT Solutions' },
  { brand: 'Lenovo', model: 'ThinkPad X1 Carbon Gen 7', specs: { cpu: 'Intel i7-8565U', ram: '16GB', storage: '512GB SSD' }, grade: 'B', price: 499.99, supplier: 'ReFurb Direct' },
  { brand: 'HP', model: 'ProBook 450 G7', specs: { cpu: 'Intel i5-10210U', ram: '8GB', storage: '256GB SSD' }, grade: 'C', price: 249.99, supplier: 'BulkTech Wholesale' },
  { brand: 'Dell', model: 'Inspiron 15 3520', specs: { cpu: 'Intel i3-1215U', ram: '8GB', storage: '256GB SSD' }, grade: 'B', price: 279.99, supplier: 'BulkTech Wholesale' },
  { brand: 'Apple', model: 'MacBook Air M1 2020', specs: { cpu: 'Apple M1', ram: '8GB', storage: '256GB SSD' }, grade: 'A', price: 699.99, supplier: 'GreenIT Solutions' },
  { brand: 'Lenovo', model: 'IdeaPad 3 15', specs: { cpu: 'AMD Ryzen 5 5500U', ram: '8GB', storage: '512GB SSD' }, grade: 'C', price: 219.99, supplier: 'TechRecycle Co' },
  { brand: 'HP', model: 'Pavilion 15', specs: { cpu: 'Intel i5-1135G7', ram: '16GB', storage: '512GB SSD' }, grade: 'B', price: 389.99, supplier: 'ReFurb Direct' },
];

async function main() {
  console.log('Seeding database...\n');

  const adminPin = generatePin();
  const cashierPin = generatePin();

  const adminHash = await bcrypt.hash(adminPin, 10);
  const cashierHash = await bcrypt.hash(cashierPin, 10);

  const admin = await prisma.staff.create({
    data: { name: 'Admin User', role: 'admin', pin: adminHash, requires_pin_reset: true },
  });

  const cashier = await prisma.staff.create({
    data: { name: 'Cashier User', role: 'cashier', pin: cashierHash, requires_pin_reset: true },
  });

  console.log('=== STAFF CREDENTIALS (save these — shown only once) ===');
  console.log(`Admin   → ID: ${admin.staff_id}, Temporary PIN: ${adminPin}`);
  console.log(`Cashier → ID: ${cashier.staff_id}, Temporary PIN: ${cashierPin}`);
  console.log('=========================================================\n');

  for (let i = 0; i < sampleUnits.length; i++) {
    const u = sampleUnits[i];
    const qr_code = `UNIT-${String(i + 1).padStart(5, '0')}`;
    await prisma.unit.create({
      data: {
        qr_code,
        brand: u.brand,
        model: u.model,
        specs: u.specs,
        grade: u.grade,
        price: u.price,
        supplier: u.supplier,
        staff_id: admin.staff_id,
      },
    });
  }

  console.log(`Created ${sampleUnits.length} sample units.`);
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
