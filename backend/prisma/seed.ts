import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Company_Master_Rules...');
  const rules = [
    { Rule_Name: 'Standard_Monthly_Hours', Value: 165, Description: '38 hours x 4.33 weeks' },
    { Rule_Name: 'Max_Monthly_Hours', Value: 260, Description: '60 hours x 4.33 weeks' },
    { Rule_Name: 'Min_Monthly_Hours', Value: 0, Description: 'Casual/no shifts; negative is invalid' },
    { Rule_Name: 'Max_Daily_Hours', Value: 12, Description: 'Checked per punch pair; a 14-hour day is wrong' },
    { Rule_Name: 'Overtime_Threshold', Value: 165, Description: 'Hours above 165 in the month' },
  ];
  for (const rule of rules) {
    await prisma.company_Master_Rules.upsert({
      where: { Rule_Name: rule.Rule_Name },
      update: { Value: rule.Value, Description: rule.Description },
      create: { Rule_Name: rule.Rule_Name, Value: rule.Value, Description: rule.Description },
    });
  }

  console.log('Seeding Valid_Departments...');
  const departments = ['HR', 'Finance', 'Payroll', 'Manufacturing', 'Warehouse', 'Sales', 'IT', 'Executive'];
  for (const dept of departments) {
    await prisma.valid_Departments.upsert({
      where: { Department: dept },
      update: {},
      create: { Department: dept },
    });
  }

  console.log('Seeding Valid_Cost_Centres...');
  const centres = [
    { Cost_Centre_Code: 'CC-100', Description: 'Payroll & HR' },
    { Cost_Centre_Code: 'CC-110', Description: 'Finance' },
    { Cost_Centre_Code: 'CC-200', Description: 'Manufacturing' },
    { Cost_Centre_Code: 'CC-210', Description: 'Warehouse' },
    { Cost_Centre_Code: 'CC-300', Description: 'Sales' },
    { Cost_Centre_Code: 'CC-400', Description: 'IT' },
    { Cost_Centre_Code: 'CC-500', Description: 'Executive' },
  ];
  for (const cc of centres) {
    await prisma.valid_Cost_Centres.upsert({
      where: { Cost_Centre_Code: cc.Cost_Centre_Code },
      update: { Description: cc.Description },
      create: cc,
    });
  }

  console.log('Seeding Users...');
  const adminHash = await bcrypt.hash('admin123', 10);
  const managerHash = await bcrypt.hash('payroll123', 10);

  await prisma.users.upsert({
    where: { Username: 'admin' },
    update: { Password: adminHash, Role: 'Admin' },
    create: { Username: 'admin', Password: adminHash, Role: 'Admin' },
  });
  await prisma.users.upsert({
    where: { Username: 'payroll_manager' },
    update: { Password: managerHash, Role: 'Payroll Manager' },
    create: { Username: 'payroll_manager', Password: managerHash, Role: 'Payroll Manager' },
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
