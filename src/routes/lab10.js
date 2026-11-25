const express = require('express');
const router = express.Router();
const config = require('../config');

// Product catalog
const PRODUCTS = {
  'usb-armory': {
    id: 'usb-armory',
    name: 'USB Armory Mk II',
    category: 'Hardware',
    price: '$149.99',
    rating: '4.7',
    reviewCount: 142,
    description: 'Open-source USB computer designed for security research and application development. Features a 900 MHz ARM Cortex-A7 processor, 512 MB DDR3 RAM, USB Type-C, and an optional M.2 slot for storage expansion. Runs Linux out of the box.',
    specs: [
      { label: 'Processor', value: 'Freescale i.MX6UL, 900 MHz ARM Cortex-A7' },
      { label: 'Memory', value: '512 MB DDR3' },
      { label: 'Interface', value: 'USB Type-C (host/device)' },
      { label: 'OS', value: 'Linux (mainline kernel)' },
      { label: 'Dimensions', value: '65 x 19 mm' },
      { label: 'Weight', value: '14 g' }
    ]
  },
  'lan-turtle': {
    id: 'lan-turtle',
    name: 'Hak5 LAN Turtle',
    category: 'Hardware',
    price: '$59.99',
    rating: '4.5',
    reviewCount: 89,
    description: 'Covert network auditing tool that conceals itself as a USB Ethernet adapter. Provides passive tap capabilities, automated man-in-the-middle operations, and remote access via reverse shell over SSH. OpenWrt-based for full customization.',
    specs: [
      { label: 'Interface', value: 'USB Type-A (Ethernet adapter form factor)' },
      { label: 'Throughput', value: '10/100 Mbps' },
      { label: 'OS', value: 'OpenWrt Linux' },
      { label: 'Connectivity', value: 'USB, Ethernet' },
      { label: 'Storage', value: '8 MB flash' },
      { label: 'Protocols', value: 'SSH, DNS, HTTP' }
    ]
  },
  'rubber-ducky': {
    id: 'rubber-ducky',
    name: 'USB Rubber Ducky',
    category: 'Hardware',
    price: '$54.99',
    rating: '4.8',
    reviewCount: 310,
    description: 'The original keystroke injection tool. Presents as a standard USB HID keyboard to any host. Payloads are written in Ducky Script and can type at superhuman speed. Used in red team engagements and physical security assessments.',
    specs: [
      { label: 'Interface', value: 'USB Type-A, HID (keyboard)' },
      { label: 'Payload Language', value: 'DuckyScript 3.0' },
      { label: 'Storage', value: 'microSD slot' },
      { label: 'Compatibility', value: 'All OS with USB HID support' },
      { label: 'Attack Speed', value: 'Up to 1000 WPM' },
      { label: 'Dimensions', value: 'Standard USB thumb drive' }
    ]
  },
  'wifi-pineapple': {
    id: 'wifi-pineapple',
    name: 'WiFi Pineapple Mark VII',
    category: 'Hardware',
    price: '$109.99',
    rating: '4.6',
    reviewCount: 215,
    description: 'Professional wireless auditing platform for penetration testers. Conduct rogue access point, man-in-the-middle, and wireless reconnaissance assessments. Web-based management interface and an extensible module system.',
    specs: [
      { label: 'Processor', value: '580 MHz MIPS' },
      { label: 'Memory', value: '256 MB DDR2' },
      { label: 'Radios', value: '2.4 GHz + 5 GHz dual-band' },
      { label: 'Antennas', value: '2x RP-SMA (included)' },
      { label: 'OS', value: 'Pineapple OS (OpenWrt-based)' },
      { label: 'Interface', value: 'USB-C power, Ethernet' }
    ]
  }
};

const DEFAULT_PRODUCT = PRODUCTS['usb-armory'];

const AVAILABLE_STORES = [
  { id: 'jakarta-central', name: 'Jakarta Central' },
  { id: 'surabaya-tech', name: 'Surabaya Tech Hub' },
  { id: 'bandung-east', name: 'Bandung East Mall' },
  { id: 'bali-harbor', name: 'Bali Harbor Store' },
  { id: 'medan-north', name: 'Medan North Branch' }
];

const STOCK_DATA = {
  'jakarta-central':  { 'usb-armory': 4, 'lan-turtle': 12, 'rubber-ducky': 7, 'wifi-pineapple': 2 },
  'surabaya-tech':    { 'usb-armory': 0, 'lan-turtle': 3,  'rubber-ducky': 15, 'wifi-pineapple': 6 },
  'bandung-east':     { 'usb-armory': 1, 'lan-turtle': 0,  'rubber-ducky': 9,  'wifi-pineapple': 0 },
  'bali-harbor':      { 'usb-armory': 8, 'lan-turtle': 5,  'rubber-ducky': 0,  'wifi-pineapple': 11 },
  'medan-north':      { 'usb-armory': 2, 'lan-turtle': 7,  'rubber-ducky': 3,  'wifi-pineapple': 4 }
};

// Lab 10: DOM XSS in document.write inside a select element
router.get('/', (req, res) => {
  res.cookie('flag', config.flags.lab10, {
    httpOnly: false,
    path: '/lab10',
    sameSite: 'lax'
  });

  const productKey = req.query.product || 'usb-armory';
  const product = PRODUCTS[productKey] || DEFAULT_PRODUCT;

  // storeId from query param — passed raw to template for DOM XSS sink (document.write in select)
  const storeId = req.query.storeId !== undefined ? String(req.query.storeId) : null;

  // Look up stock (safe server-side lookup using known keys)
  let storeStock = null;
  if (storeId && STOCK_DATA[storeId] && STOCK_DATA[storeId][product.id] !== undefined) {
    storeStock = STOCK_DATA[storeId][product.id];
  }

  res.render('lab10', {
    product,
    availableStores: AVAILABLE_STORES,
    storeId,
    storeStock
  });
});

module.exports = router;
