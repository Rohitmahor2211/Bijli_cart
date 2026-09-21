import { connectDB } from '../config/db.js';
import { GlobalCategory } from '../models/globalCategory.model.js';

const taxonomy = [
  ['Mobiles', 'mobiles', ['Smartphones', 'Feature Phones', 'Mobile Accessories'], [['processor', 'Processor'], ['displaySize', 'Display size'], ['displayType', 'Display type'], ['resolution', 'Resolution'], ['refreshRate', 'Refresh rate'], ['batteryCapacity', 'Battery capacity'], ['rearCamera', 'Rear camera'], ['frontCamera', 'Front camera'], ['operatingSystem', 'Operating system'], ['network', 'Network / 5G support'], ['simType', 'SIM type']]],
  ['Televisions', 'tvs', ['Smart TVs', 'LED TVs', 'TV Accessories'], [['screenSize', 'Screen size'], ['displayType', 'Display type'], ['resolution', 'Resolution'], ['refreshRate', 'Refresh rate'], ['hdr', 'HDR'], ['smartTv', 'Smart TV'], ['operatingSystem', 'Operating system'], ['hdmiPorts', 'HDMI ports'], ['usbPorts', 'USB ports'], ['wifi', 'Wi-Fi'], ['bluetooth', 'Bluetooth'], ['speakerOutput', 'Speaker output']]],
  ['Air Conditioners', 'air-conditioners', ['Split ACs', 'Window ACs'], [['acType', 'AC type'], ['capacity', 'Capacity'], ['starRating', 'Star rating'], ['coolingCapacity', 'Cooling capacity'], ['compressorType', 'Compressor type'], ['inverter', 'Inverter'], ['energyRating', 'Energy rating'], ['roomSize', 'Room size'], ['refrigerant', 'Refrigerant'], ['wifi', 'Wi-Fi'], ['noiseLevel', 'Noise level']]],
  ['Refrigerators', 'refrigerators', ['Single Door Refrigerators', 'Double Door Refrigerators'], [['refrigeratorType', 'Refrigerator type'], ['capacity', 'Capacity'], ['doorType', 'Door type'], ['energyRating', 'Energy rating'], ['compressorType', 'Compressor type'], ['coolingTechnology', 'Cooling technology'], ['defrostSystem', 'Defrost system'], ['starRating', 'Star rating'], ['height', 'Height'], ['width', 'Width'], ['depth', 'Depth']]],
  ['Laptops', 'laptops', ['Business Laptops', 'Gaming Laptops'], [['processor', 'Processor'], ['processorGeneration', 'Processor generation'], ['ram', 'RAM'], ['ramType', 'RAM type'], ['storage', 'Storage'], ['storageType', 'Storage type'], ['displaySize', 'Display size'], ['resolution', 'Resolution'], ['refreshRate', 'Refresh rate'], ['graphicsCard', 'Graphics card'], ['operatingSystem', 'Operating system'], ['battery', 'Battery'], ['weight', 'Weight']]],
  ['Washing Machines', 'washing-machines', ['Front Load Washing Machines', 'Top Load Washing Machines'], [['washingMachineType', 'Washing machine type'], ['loadType', 'Load type'], ['capacity', 'Capacity'], ['motorType', 'Motor type'], ['spinSpeed', 'Spin speed'], ['energyRating', 'Energy rating'], ['washPrograms', 'Wash programs'], ['inverter', 'Inverter'], ['displayType', 'Display type']]],
  ['Audio', 'audio', ['Headphones', 'Earbuds', 'Speakers'], [['audioType', 'Audio type'], ['connectivity', 'Connectivity']]],
];
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

await connectDB();
for (let index = 0; index < taxonomy.length; index += 1) {
  const [name, slug, children, specificationDefinitions = []] = taxonomy[index];
  const definitions = specificationDefinitions.map(([key, label]) => ({ key, label, type: 'text', required: true, options: [] }));
  const root = await GlobalCategory.findOneAndUpdate({ slug }, { $set: { name, isActive: true, isLeaf: false, specificationDefinitions: definitions, filterSchema: definitions, navigation: { showInHeader: true, headerPosition: index + 1, showOnHome: true }, seo: { title: `${name} | bijliKart`, description: `Shop ${name} from verified bijliKart sellers.` } }, $setOnInsert: { slug, parentId: null, path: [], level: 0 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
  for (const childName of children) {
    const childSlug = `${slug}-${slugify(childName)}`;
    await GlobalCategory.updateOne({ slug: childSlug }, { $set: { name: childName, parentId: root._id, path: [root._id], level: 1, isLeaf: true, isActive: true, specificationDefinitions: definitions, filterSchema: definitions, navigation: { showInHeader: false, headerPosition: 999, showOnHome: false } }, $setOnInsert: { slug: childSlug, seo: { title: `${childName} | bijliKart`, description: `Shop ${childName} from verified bijliKart sellers.` } } }, { upsert: true, setDefaultsOnInsert: true });
  }
}
console.log('Global marketplace category taxonomy is ready.');
process.exit(0);
