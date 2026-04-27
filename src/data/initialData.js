// Inline SVG placeholders so the showcase looks alive without bundled image binaries.
// Replace via the Admin panel by uploading real photos (saved as data URLs).

const placeholder = (label, color) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'>
      <defs>
        <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stop-color='${color}'/>
          <stop offset='100%' stop-color='#0f172a'/>
        </linearGradient>
      </defs>
      <rect width='800' height='500' fill='url(#g)'/>
      <g fill='#ffffff' font-family='Inter, sans-serif' text-anchor='middle'>
        <text x='400' y='250' font-size='42' font-weight='700'>${label}</text>
        <text x='400' y='290' font-size='18' opacity='0.8'>IMT Karoseri</text>
      </g>
    </svg>`
  )}`;

export const initialCategories = [
  {
    id: "pemadam",
    name: "Mobil Pemadam",
    slug: "mobil-pemadam",
    description:
      "Unit pemadam kebakaran dengan tangki air, pompa bertekanan tinggi, dan sistem foam.",
    icon: "fire",
  },
  {
    id: "ambulance",
    name: "Ambulance",
    slug: "ambulance",
    description:
      "Ambulance tipe transport, emergency, hingga PSC sesuai standar Kemenkes.",
    icon: "cross",
  },
  {
    id: "golf-car",
    name: "Golf Car",
    slug: "golf-car",
    description:
      "Kendaraan listrik untuk lapangan golf, kawasan resort, hotel, dan area industri.",
    icon: "leaf",
  },
  {
    id: "rantis",
    name: "Mobil Rantis",
    slug: "mobil-rantis",
    description:
      "Kendaraan taktis dengan plat baja, ban run-flat, dan konfigurasi sesuai misi.",
    icon: "shield",
  },
  {
    id: "food-truck",
    name: "Food Truck",
    slug: "food-truck",
    description:
      "Food truck custom dengan layout dapur, instalasi gas, dan kelistrikan komersial.",
    icon: "utensils",
  },
  {
    id: "satelit",
    name: "Mobil Satelit",
    slug: "mobil-satelit",
    description:
      "Mobile broadcasting & SNG vehicle dengan antena VSAT, mast, dan rack equipment.",
    icon: "antenna",
  },
];

export const initialVehicles = [
  {
    id: "v-pemadam-1",
    name: "Fire Truck Rapid Intervention 4x4",
    categoryId: "pemadam",
    tagline: "Respon cepat untuk akses kawasan padat & off-road ringan.",
    description:
      "Dibangun di atas chassis 4x4 dengan tangki air 2.000 liter, pompa Ziegler 2.000 LPM, dan reel selang otomatis. Cocok untuk industri, bandara, dan pemadam kota.",
    images: [
      placeholder("Fire Truck 4x4", "#dc2626"),
      placeholder("Pompa Ziegler", "#b91c1c"),
      placeholder("Reel Selang", "#7f1d1d"),
    ],
    specs: {
      Chassis: "Mitsubishi Canter 4x4 FG",
      "Kapasitas Tangki Air": "2.000 L",
      "Kapasitas Tangki Foam": "200 L",
      Pompa: "Ziegler 2.000 LPM @ 10 bar",
      Monitor: "Akron 1.250 GPM",
      Crew: "1 + 4 personel",
      "Panjang x Lebar x Tinggi": "5.800 x 2.100 x 2.900 mm",
    },
    features: [
      "Lampu strobo LED 360°",
      "Sirine elektronik 200W",
      "Locker peralatan rolling shutter",
      "Self-protection spray bawah chassis",
    ],
  },
  {
    id: "v-ambulance-1",
    name: "Ambulance Emergency Type C",
    categoryId: "ambulance",
    tagline: "Standar Kemenkes RI - lengkap dengan ICU equipment.",
    description:
      "Ambulance emergency dengan kabin tinggi, ventilator, defibrillator, dan stretcher hidrolik. Interior fiberglass anti-bakteri dengan sirkulasi udara HEPA.",
    images: [
      placeholder("Ambulance Type C", "#0ea5e9"),
      placeholder("Interior ICU", "#0369a1"),
      placeholder("Stretcher Hidrolik", "#0c4a6e"),
    ],
    specs: {
      Chassis: "Toyota Hiace Premio",
      "Tipe Ambulance": "Emergency / Type C",
      Stretcher: "Ferno Mondial Hidrolik",
      Oksigen: "2 x 6m³ + portable",
      "Power Inverter": "2.000W pure sine wave",
      "Suction Pump": "Electric & manual",
      "Komunikasi": "VHF radio + GPS tracker",
    },
    features: [
      "Lampu strobo LED bar 1.200 mm",
      "Sirine 100W dengan PA system",
      "Lantai vinyl anti slip & anti bakteri",
      "AC double blower kabin pasien",
    ],
  },
  {
    id: "v-golf-1",
    name: "Golf Car Elektrik 6 Penumpang",
    categoryId: "golf-car",
    tagline: "Operasional senyap & bebas emisi untuk resort dan kawasan.",
    description:
      "Golf car elektrik 48V dengan kapasitas 6 penumpang, kanopi fiberglass, dan baterai lithium opsional. Jarak tempuh hingga 80 km per pengisian.",
    images: [
      placeholder("Golf Car 6 Seater", "#16a34a"),
      placeholder("Dashboard Digital", "#15803d"),
      placeholder("Kanopi Fiberglass", "#166534"),
    ],
    specs: {
      Motor: "AC Motor 5 kW",
      Baterai: "Lithium 48V 105Ah (opsional)",
      "Jarak Tempuh": "Hingga 80 km",
      "Kecepatan Maksimum": "30 km/jam",
      Kapasitas: "6 penumpang",
      Pengereman: "Hydraulic disc 4 roda",
      "Waktu Pengisian": "6-8 jam",
    },
    features: [
      "Lampu LED depan & belakang",
      "Dashboard digital MID",
      "USB charging port",
      "Velg alloy 10 inci",
    ],
  },
  {
    id: "v-rantis-1",
    name: "Rantis Patroli APC Light",
    categoryId: "rantis",
    tagline: "Mobilitas tinggi untuk operasi pengamanan & pengendalian massa.",
    description:
      "Kendaraan taktis ringan dengan plat baja level B6, ban run-flat, dan kubah penembak. Konfigurasi 8 personel bersenjata lengkap.",
    images: [
      placeholder("Rantis APC", "#475569"),
      placeholder("Kubah Penembak", "#334155"),
      placeholder("Interior Personel", "#1e293b"),
    ],
    specs: {
      Chassis: "Isuzu D-Max 4x4 Heavy Duty",
      "Level Proteksi": "B6 (NIJ Level IV)",
      Ban: "Run-flat 285/75 R16",
      Kapasitas: "1 + 7 personel bersenjata",
      "Kubah Penembak": "Manual rotating turret",
      "Berat Kosong": "3.800 kg",
      Komunikasi: "VHF/UHF tactical radio",
    },
    features: [
      "Plat baja ballistic seluruh kabin",
      "Kaca anti peluru 40 mm",
      "Run-flat insert pada seluruh ban",
      "Smoke launcher 4 tabung",
      "Gun port samping & belakang",
    ],
  },
  {
    id: "v-foodtruck-1",
    name: "Food Truck Premium Series",
    categoryId: "food-truck",
    tagline: "Dapur komersial mobile dengan layout fully customizable.",
    description:
      "Food truck dengan dinding sandwich panel, instalasi gas LPG sentral, exhaust hood stainless, dan jendela serving lipat hidrolik. Siap operasional di event & lokasi premium.",
    images: [
      placeholder("Food Truck Premium", "#f59e0b"),
      placeholder("Dapur Stainless", "#d97706"),
      placeholder("Serving Window", "#92400e"),
    ],
    specs: {
      Chassis: "Mitsubishi Colt L300 / Hino 110",
      "Dimensi Kabin Dapur": "3.200 x 1.900 x 1.950 mm",
      "Material Lantai": "Stainless steel SS304",
      "Instalasi Gas": "LPG sentral 12 kg + regulator",
      "Power Listrik": "Genset silent 5 kVA",
      "Tangki Air Bersih": "150 L",
      "Tangki Air Kotor": "120 L",
    },
    features: [
      "Exhaust hood stainless + filter",
      "Jendela serving hidrolik",
      "Awning electric retractable",
      "Lampu LED interior dimmable",
      "Wastafel 2 bak + water heater",
    ],
  },
  {
    id: "v-satelit-1",
    name: "SNG Satellite Broadcasting Van",
    categoryId: "satelit",
    tagline: "Mobile uplink untuk live broadcasting dari lokasi remote.",
    description:
      "Satellite News Gathering vehicle dengan antena VSAT 1,8m auto-pointing, mast pneumatic 9m, rack equipment 19 inci, dan ruang editing on-board.",
    images: [
      placeholder("SNG Van", "#8b5cf6"),
      placeholder("VSAT Antenna", "#7c3aed"),
      placeholder("Editing Room", "#5b21b6"),
    ],
    specs: {
      Chassis: "Mercedes-Benz Sprinter 519 CDI",
      "Antena Satelit": "VSAT 1,8m Ku-Band auto pointing",
      Mast: "Pneumatic 9m dengan kamera PTZ",
      "Rack Equipment": "2 x 42U 19 inci",
      "Power System": "Genset 15 kVA + UPS 6 kVA",
      "AC Equipment": "Dedicated 18.000 BTU",
      Workstation: "2 editing seat + 1 producer",
    },
    features: [
      "Auto-deploy antena dengan GPS lock",
      "Encoder MPEG-4 HD/4K",
      "Intercom 8 channel",
      "Floor anti-static raised",
      "Cable hatch heavy duty",
    ],
  },
];

export const companyInfo = {
  name: "IMT Karoseri",
  tagline: "Spesialis Karoseri Kendaraan Khusus & Custom Built Indonesia",
  phone: "+62 21 5555 8888",
  email: "info@imtkaroseri.co.id",
  address: "Jl. Raya Industri No. 88, Bekasi, Jawa Barat 17530",
  hours: "Senin - Sabtu, 08.00 - 17.00 WIB",
};
