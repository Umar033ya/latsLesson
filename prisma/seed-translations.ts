/** Russian and Uzbek texts of the official content, keyed by the English prompt or title. English-language questions stay in English. */
export const QUESTION_TEXT: Record<string, Record<string, object>> = {
 "What is the SI unit of force?": {
  "ru": {
   "prompt": "Какова единица силы в СИ?",
   "explanation": "Сила измеряется в ньютонах (Н).",
   "options": {
    "a": "Джоуль",
    "b": "Ватт",
    "c": "Ньютон",
    "d": "Паскаль"
   }
  },
  "uz": {
   "prompt": "Kuchning SI birligi qaysi?",
   "explanation": "Kuch nyutonda (N) o‘lchanadi.",
   "options": {
    "a": "Joul",
    "b": "Vatt",
    "c": "Nyuton",
    "d": "Paskal"
   }
  }
 },
 "What is speed calculated as?": {
  "ru": {
   "prompt": "Как вычисляется скорость?",
   "explanation": "Скорость = расстояние / время.",
   "options": {
    "a": "Расстояние ÷ время",
    "b": "Время ÷ расстояние",
    "c": "Масса × ускорение",
    "d": "Сила × расстояние"
   }
  },
  "uz": {
   "prompt": "Tezlik qanday hisoblanadi?",
   "explanation": "Tezlik = masofa / vaqt.",
   "options": {
    "a": "Masofa ÷ vaqt",
    "b": "Vaqt ÷ masofa",
    "c": "Massa × tezlanish",
    "d": "Kuch × masofa"
   }
  }
 },
 "An object accelerates at 2 m/s² with mass 3 kg. What force acts on it?": {
  "ru": {
   "prompt": "Тело массой 3 кг движется с ускорением 2 м/с². Какая сила действует?",
   "explanation": "F = m × a = 3 × 2 = 6 Н."
  },
  "uz": {
   "prompt": "Massasi 3 kg jism 2 m/s² tezlanish bilan harakatlanadi. Qanday kuch ta’sir etadi?",
   "explanation": "F = m × a = 3 × 2 = 6 N."
  }
 },
 "What form of energy does a moving car have?": {
  "ru": {
   "prompt": "Какой энергией обладает движущаяся машина?",
   "explanation": "Движущиеся тела обладают кинетической энергией.",
   "options": {
    "a": "Химической",
    "b": "Кинетической",
    "c": "Потенциальной",
    "d": "Ядерной"
   }
  },
  "uz": {
   "prompt": "Harakatdagi mashina qanday energiyaga ega?",
   "explanation": "Harakatdagi jismlar kinetik energiyaga ega.",
   "options": {
    "a": "Kimyoviy",
    "b": "Kinetik",
    "c": "Potensial",
    "d": "Yadro"
   }
  }
 },
 "What is the unit of electrical resistance?": {
  "ru": {
   "prompt": "В чём измеряется электрическое сопротивление?",
   "explanation": "Сопротивление измеряется в омах (Ом).",
   "options": {
    "a": "Ампер",
    "b": "Вольт",
    "d": "Ватт"
   }
  },
  "uz": {
   "prompt": "Elektr qarshiligi birligi qaysi?",
   "explanation": "Qarshilik omda (Ω) o‘lchanadi.",
   "options": {
    "a": "Amper",
    "b": "Volt",
    "d": "Vatt"
   }
  }
 },
 "If voltage is 12 V and resistance is 4 Ω, what is current?": {
  "ru": {
   "prompt": "Напряжение 12 В, сопротивление 4 Ом. Какова сила тока?",
   "explanation": "I = V / R = 12 / 4 = 3 А."
  },
  "uz": {
   "prompt": "Kuchlanish 12 V, qarshilik 4 Ω. Tok kuchi qancha?",
   "explanation": "I = V / R = 12 / 4 = 3 A."
  }
 },
 "A car travels 120 km in 2 hours. What is its average speed in km/h? Type only the number.": {
  "ru": {
   "prompt": "Машина проехала 120 км за 2 часа. Какова средняя скорость в км/ч? Введите только число.",
   "explanation": "120 ÷ 2 = 60 км/ч."
  },
  "uz": {
   "prompt": "Mashina 2 soatda 120 km yurdi. O‘rtacha tezligi km/soatda? Faqat sonni yozing.",
   "explanation": "120 ÷ 2 = 60 km/soat."
  }
 },
 "Match the energy type to the example.": {
  "ru": {
   "prompt": "Соедините вид энергии с примером.",
   "explanation": "Батарейка хранит химическую энергию, падающее тело имеет кинетическую.",
   "options": {
    "battery": "Батарейка",
    "falling": "Падающее яблоко",
    "chemical": "Химическая энергия",
    "kinetic": "Кинетическая энергия"
   }
  },
  "uz": {
   "prompt": "Energiya turini misol bilan moslang.",
   "explanation": "Batareya kimyoviy energiya saqlaydi, tushayotgan jism kinetik energiyaga ega.",
   "options": {
    "battery": "Batareya",
    "falling": "Tushayotgan olma",
    "chemical": "Kimyoviy energiya",
    "kinetic": "Kinetik energiya"
   }
  }
 },
 "What happens to the period of a pendulum if its length increases?": {
  "ru": {
   "prompt": "Что будет с периодом маятника, если его длина увеличится?",
   "explanation": "У длинного маятника период больше.",
   "options": {
    "a": "Увеличится",
    "b": "Уменьшится",
    "c": "Не изменится",
    "d": "Станет нулём"
   }
  },
  "uz": {
   "prompt": "Mayatnik uzunligi oshsa, davri qanday o‘zgaradi?",
   "explanation": "Uzun mayatnik davri kattaroq.",
   "options": {
    "a": "Oshadi",
    "b": "Kamayadi",
    "c": "O‘zgarmaydi",
    "d": "Nolga teng bo‘ladi"
   }
  }
 },
 "Order these steps of the scientific method.": {
  "ru": {
   "prompt": "Расположите шаги научного метода.",
   "explanation": "Сначала наблюдение, затем гипотеза, затем эксперимент.",
   "options": {
    "observe": "Наблюдение",
    "hypothesis": "Гипотеза",
    "experiment": "Эксперимент"
   }
  },
  "uz": {
   "prompt": "Ilmiy usul bosqichlarini tartiblang.",
   "explanation": "Avval kuzatish, keyin gipoteza, so‘ng tajriba.",
   "options": {
    "observe": "Kuzatish",
    "hypothesis": "Gipoteza",
    "experiment": "Tajriba"
   }
  }
 },
 "A train covers 240 km in 3 hours. Set its average speed in km/h.": {
  "ru": {
   "prompt": "Поезд прошёл 240 км за 3 часа. Наберите среднюю скорость в км/ч.",
   "explanation": "240 ÷ 3 = 80 км/ч.",
   "hint": "Скорость = расстояние ÷ время."
  },
  "uz": {
   "prompt": "Poyezd 3 soatda 240 km yurdi. O‘rtacha tezligini km/soatda tering.",
   "explanation": "240 ÷ 3 = 80 km/soat.",
   "hint": "Tezlik = masofa ÷ vaqt."
  }
 },
 "Switch on every renewable energy source.": {
  "ru": {
   "prompt": "Включите все возобновляемые источники энергии.",
   "explanation": "Уголь и газ не восстанавливаются за время жизни людей.",
   "options": {
    "a": "Ветер",
    "b": "Уголь",
    "c": "Солнце",
    "d": "Природный газ",
    "e": "Приливы"
   }
  },
  "uz": {
   "prompt": "Barcha qayta tiklanuvchi energiya manbalarini yoqing.",
   "explanation": "Ko‘mir va gaz inson umri davomida tiklanmaydi.",
   "options": {
    "a": "Shamol",
    "b": "Ko‘mir",
    "c": "Quyosh",
    "d": "Tabiiy gaz",
    "e": "Suv ko‘tarilishi"
   }
  }
 },
 "Switch on every good electrical conductor.": {
  "ru": {
   "prompt": "Включите все хорошие проводники тока.",
   "explanation": "Металлы и солёная вода пропускают заряд.",
   "options": {
    "a": "Медь",
    "b": "Резина",
    "c": "Алюминий",
    "d": "Стекло",
    "e": "Солёная вода"
   }
  },
  "uz": {
   "prompt": "Tokni yaxshi o‘tkazadiganlarni yoqing.",
   "explanation": "Metallar va sho‘r suv zaryadni o‘tkazadi.",
   "options": {
    "a": "Mis",
    "b": "Rezina",
    "c": "Alyuminiy",
    "d": "Shisha",
    "e": "Sho‘r suv"
   }
  }
 },
 "An object moving at constant velocity has zero resultant force.": {
  "ru": {
   "prompt": "Если тело движется с постоянной скоростью, равнодействующая сил равна нулю.",
   "explanation": "Первый закон Ньютона: без равнодействующей движение не меняется."
  },
  "uz": {
   "prompt": "Jism o‘zgarmas tezlikda harakatlansa, teng ta’sir etuvchi kuch nolga teng.",
   "explanation": "Nyutonning birinchi qonuni: kuch bo‘lmasa, harakat o‘zgarmaydi."
  }
 },
 "Energy can be created but not destroyed.": {
  "ru": {
   "prompt": "Энергию можно создать, но нельзя уничтожить.",
   "explanation": "Энергия только передаётся или превращается."
  },
  "uz": {
   "prompt": "Energiyani yaratish mumkin, lekin yo‘q qilib bo‘lmaydi.",
   "explanation": "Energiya faqat uzatiladi yoki boshqa turga aylanadi."
  }
 },
 "Order the energy changes when a torch is switched on.": {
  "ru": {
   "prompt": "Расположите превращения энергии при включении фонарика.",
   "explanation": "Батарейка создаёт ток, лампа превращает его в свет и тепло.",
   "options": {
    "a": "Химическая (батарейка)",
    "b": "Электрическая (провод)",
    "c": "Свет и тепло (лампа)"
   }
  },
  "uz": {
   "prompt": "Fonar yoqilganda energiya o‘zgarishini tartiblang.",
   "explanation": "Batareya tok beradi, lampa uni yorug‘lik va issiqlikka aylantiradi.",
   "options": {
    "a": "Kimyoviy (batareya)",
    "b": "Elektr (sim)",
    "c": "Yorug‘lik va issiqlik (lampa)"
   }
  }
 },
 "Pair each quantity with its unit.": {
  "ru": {
   "prompt": "Соедините величину с единицей.",
   "explanation": "Единицы названы в честь Ньютона, Джоуля и Уатта.",
   "options": {
    "l0": "Сила",
    "l1": "Энергия",
    "l2": "Мощность",
    "r0": "Ньютон",
    "r1": "Джоуль",
    "r2": "Ватт"
   }
  },
  "uz": {
   "prompt": "Kattalikni birligi bilan moslang.",
   "explanation": "Birliklar Nyuton, Joul va Uatt nomi bilan atalgan.",
   "options": {
    "l0": "Kuch",
    "l1": "Energiya",
    "l2": "Quvvat",
    "r0": "Nyuton",
    "r1": "Joul",
    "r2": "Vatt"
   }
  }
 },
 "What is the value of 7 × 8?": {
  "ru": {
   "prompt": "Сколько будет 7 × 8?",
   "explanation": "Семь групп по восемь: 56."
  },
  "uz": {
   "prompt": "7 × 8 nechaga teng?",
   "explanation": "Yetti marta sakkiz: 56."
  }
 },
 "Solve for x: 3x + 6 = 21": {
  "ru": {
   "prompt": "Найдите x: 3x + 6 = 21",
   "explanation": "Вычтите 6: 3x = 15, значит x = 5."
  },
  "uz": {
   "prompt": "x ni toping: 3x + 6 = 21",
   "explanation": "6 ni ayiring: 3x = 15, demak x = 5."
  }
 },
 "What is the area of a rectangle 9 cm by 4 cm?": {
  "ru": {
   "prompt": "Какова площадь прямоугольника 9 см на 4 см?",
   "explanation": "Площадь = длина × ширина = 36 см²."
  },
  "uz": {
   "prompt": "Tomonlari 9 sm va 4 sm to‘rtburchak yuzi qancha?",
   "explanation": "Yuza = uzunlik × en = 36 sm²."
  }
 },
 "If y = 2x² − 3, what is y when x = 4?": {
  "ru": {
   "prompt": "Если y = 2x² − 3, чему равен y при x = 4?",
   "explanation": "2 × 16 − 3 = 29."
  },
  "uz": {
   "prompt": "y = 2x² − 3 bo‘lsa, x = 4 da y nechaga teng?",
   "explanation": "2 × 16 − 3 = 29."
  }
 },
 "What is the mean of 4, 8, 11, 13?": {
  "ru": {
   "prompt": "Чему равно среднее чисел 4, 8, 11, 13?",
   "explanation": "Сумма 36, а 36 ÷ 4 = 9."
  },
  "uz": {
   "prompt": "4, 8, 11, 13 sonlarining o‘rtachasi?",
   "explanation": "Yig‘indi 36, 36 ÷ 4 = 9."
  }
 },
 "A triangle has angles 48° and 62°. What is the third angle?": {
  "ru": {
   "prompt": "Два угла треугольника 48° и 62°. Чему равен третий?",
   "explanation": "Сумма углов 180°: 180 − 110 = 70°."
  },
  "uz": {
   "prompt": "Uchburchakning ikki burchagi 48° va 62°. Uchinchisi?",
   "explanation": "Burchaklar yig‘indisi 180°: 180 − 110 = 70°."
  }
 },
 "What is 15% of 240?": {
  "ru": {
   "prompt": "Сколько будет 15% от 240?",
   "explanation": "0,15 × 240 = 36."
  },
  "uz": {
   "prompt": "240 ning 15% i qancha?",
   "explanation": "0,15 × 240 = 36."
  }
 },
 "Write the solution: 5x = 45. Type only the number.": {
  "ru": {
   "prompt": "Решите: 5x = 45. Введите только число.",
   "explanation": "Разделите обе части на 5: x = 9."
  },
  "uz": {
   "prompt": "Yeching: 5x = 45. Faqat sonni yozing.",
   "explanation": "Ikki tomonni 5 ga bo‘ling: x = 9."
  }
 },
 "Match each shape with the number of its sides.": {
  "ru": {
   "prompt": "Соедините фигуру с числом сторон.",
   "explanation": "У треугольника 3 стороны, у четырёхугольника 4.",
   "options": {
    "tri": "Треугольник",
    "quad": "Четырёхугольник"
   }
  },
  "uz": {
   "prompt": "Shaklni tomonlari soni bilan moslang.",
   "explanation": "Uchburchakda 3, to‘rtburchakda 4 tomon.",
   "options": {
    "tri": "Uchburchak",
    "quad": "To‘rtburchak"
   }
  }
 },
 "Order these data sets from smallest to largest range.": {
  "ru": {
   "prompt": "Расположите наборы данных по возрастанию размаха.",
   "explanation": "Размахи: 2, 8 и 30."
  },
  "uz": {
   "prompt": "To‘plamlarni kengligi bo‘yicha o‘sish tartibida joylang.",
   "explanation": "Kengliklar: 2, 8 va 30."
  }
 },
 "What is the derivative of x³?": {
  "ru": {
   "prompt": "Чему равна производная x³?",
   "explanation": "По правилу степени (x³)′ = 3x².",
   "options": {
    "d": "x⁴"
   }
  },
  "uz": {
   "prompt": "x³ ning hosilasi nima?",
   "explanation": "Daraja qoidasiga ko‘ra (x³)′ = 3x².",
   "options": {
    "d": "x⁴"
   }
  }
 },
 "Set the dials to 12 × 12.": {
  "ru": {
   "prompt": "Наберите 12 × 12.",
   "explanation": "12 × 12 = 144.",
   "hint": "Десять раз по двенадцать и ещё два раза."
  },
  "uz": {
   "prompt": "12 × 12 ni tering.",
   "explanation": "12 × 12 = 144.",
   "hint": "O‘n marta o‘n ikki, yana ikki marta."
  }
 },
 "x + y = 10 and x − y = 4. Set the dials to x, then y.": {
  "ru": {
   "prompt": "x + y = 10 и x − y = 4. Наберите x, затем y.",
   "explanation": "Сложив уравнения, получим 2x = 14: x = 7, y = 3.",
   "hint": "Сложите два уравнения."
  },
  "uz": {
   "prompt": "x + y = 10 va x − y = 4. Avval x, keyin y ni tering.",
   "explanation": "Tenglamalarni qo‘shsak 2x = 14: x = 7, y = 3.",
   "hint": "Ikki tenglamani qo‘shing."
  }
 },
 "Set the dials to the smallest three-digit prime number.": {
  "ru": {
   "prompt": "Наберите наименьшее трёхзначное простое число.",
   "explanation": "100 чётное, а 101 делится только на 1 и себя.",
   "hint": "Начните со 100 и проверяйте."
  },
  "uz": {
   "prompt": "Eng kichik uch xonali tub sonni tering.",
   "explanation": "100 juft, 101 esa faqat 1 va o‘ziga bo‘linadi.",
   "hint": "100 dan boshlab tekshiring."
  }
 },
 "Set the dials to the number of degrees in the angles of a quadrilateral, added together.": {
  "ru": {
   "prompt": "Наберите сумму углов четырёхугольника в градусах.",
   "explanation": "Четырёхугольник делится на два треугольника: 2 × 180° = 360°.",
   "hint": "Разбейте на треугольники."
  },
  "uz": {
   "prompt": "To‘rtburchak burchaklari yig‘indisini graduslarda tering.",
   "explanation": "To‘rtburchak ikki uchburchakka bo‘linadi: 2 × 180° = 360°.",
   "hint": "Uchburchaklarga ajrating."
  }
 },
 "Switch on every prime number.": {
  "ru": {
   "prompt": "Включите все простые числа.",
   "explanation": "9 = 3 × 3, 15 = 3 × 5. У остальных нет меньших делителей.",
   "hint": "У простого числа ровно два делителя."
  },
  "uz": {
   "prompt": "Barcha tub sonlarni yoqing.",
   "explanation": "9 = 3 × 3, 15 = 3 × 5. Qolganlarida kichik bo‘luvchi yo‘q.",
   "hint": "Tub sonning aynan ikki bo‘luvchisi bor."
  }
 },
 "Switch on every fraction equal to one half.": {
  "ru": {
   "prompt": "Включите все дроби, равные одной второй.",
   "explanation": "Дробь равна половине, если знаменатель вдвое больше числителя.",
   "hint": "Удвойте числитель."
  },
  "uz": {
   "prompt": "Yarimga teng barcha kasrlarni yoqing.",
   "explanation": "Maxraj suratdan ikki marta katta bo‘lsa, kasr yarimga teng.",
   "hint": "Suratni ikkiga ko‘paytiring."
  }
 },
 "Switch on every set of sides that makes a right-angled triangle.": {
  "ru": {
   "prompt": "Включите все наборы сторон прямоугольного треугольника.",
   "explanation": "Только они удовлетворяют a² + b² = c².",
   "hint": "Проверьте a² + b² = c²."
  },
  "uz": {
   "prompt": "To‘g‘ri burchakli uchburchak tomonlarini yoqing.",
   "explanation": "Faqat shular a² + b² = c² ga mos.",
   "hint": "a² + b² = c² ni tekshiring."
  }
 },
 "A negative number multiplied by a negative number is positive.": {
  "ru": {
   "prompt": "Отрицательное число, умноженное на отрицательное, положительно.",
   "explanation": "Знаки сокращаются: (−2) × (−3) = 6.",
   "hint": "Попробуйте −2 и −3."
  },
  "uz": {
   "prompt": "Manfiy sonni manfiy songa ko‘paytirsa, musbat bo‘ladi.",
   "explanation": "Ishoralar qisqaradi: (−2) × (−3) = 6.",
   "hint": "−2 va −3 bilan sinab ko‘ring."
  }
 },
 "The median is always one of the numbers in the data set.": {
  "ru": {
   "prompt": "Медиана всегда совпадает с одним из чисел набора.",
   "explanation": "При чётном количестве это среднее двух средних: медиана 2 и 4 равна 3.",
   "hint": "Подумайте о наборе из двух чисел."
  },
  "uz": {
   "prompt": "Mediana doim to‘plamdagi sonlardan biriga teng.",
   "explanation": "Juft sonda u o‘rtadagi ikkitaning o‘rtachasi: 2 va 4 medianasi 3.",
   "hint": "Ikki sonli to‘plamni o‘ylang."
  }
 },
 "Every square is also a rectangle.": {
  "ru": {
   "prompt": "Любой квадрат является прямоугольником.",
   "explanation": "Прямоугольнику нужны четыре прямых угла, у квадрата они есть."
  },
  "uz": {
   "prompt": "Har qanday kvadrat to‘g‘ri to‘rtburchakdir.",
   "explanation": "To‘g‘ri to‘rtburchakka to‘rtta to‘g‘ri burchak kerak, kvadratda bor."
  }
 },
 "Put the numbers in order, smallest first.": {
  "ru": {
   "prompt": "Расположите числа по возрастанию.",
   "explanation": "Сначала отрицательные, затем 0,5 < 0,75 < 1,2.",
   "hint": "Запишите дробь десятичной."
  },
  "uz": {
   "prompt": "Sonlarni o‘sish tartibida joylang.",
   "explanation": "Avval manfiylar, keyin 0,5 < 0,75 < 1,2.",
   "hint": "Kasrni o‘nli ko‘rinishda yozing."
  }
 },
 "Put the steps for solving 2(x + 3) = 16 in order.": {
  "ru": {
   "prompt": "Расположите шаги решения 2(x + 3) = 16.",
   "explanation": "Раскройте скобки, вычтите 6, разделите на 2, проверьте.",
   "hint": "Сначала раскройте скобки.",
   "options": {
    "d": "Проверка: 2 × 8 = 16"
   }
  },
  "uz": {
   "prompt": "2(x + 3) = 16 ni yechish bosqichlarini tartiblang.",
   "explanation": "Qavsni oching, 6 ni ayiring, 2 ga bo‘ling, tekshiring.",
   "hint": "Avval qavsni oching.",
   "options": {
    "d": "Tekshirish: 2 × 8 = 16"
   }
  }
 },
 "Pair each shape with its number of sides.": {
  "ru": {
   "prompt": "Соедините фигуру с числом сторон.",
   "explanation": "Пента, гекса и окта: пять, шесть и восемь.",
   "hint": "У осьминога восемь щупалец.",
   "options": {
    "l0": "Пятиугольник",
    "l1": "Шестиугольник",
    "l2": "Восьмиугольник"
   }
  },
  "uz": {
   "prompt": "Shaklni tomonlari soni bilan moslang.",
   "explanation": "Penta, geksa va okta: besh, olti va sakkiz.",
   "hint": "Sakkizoyoqning sakkiz oyog‘i bor.",
   "options": {
    "l0": "Beshburchak",
    "l1": "Oltiburchak",
    "l2": "Sakkizburchak"
   }
  }
 },
 "Pair each expression with its value when x = 3.": {
  "ru": {
   "prompt": "Соедините выражение с его значением при x = 3.",
   "explanation": "3² = 9, 2 × 3 + 1 = 7, 12 ÷ 3 = 4.",
   "options": {
    "l2": "12 ÷ x"
   }
  },
  "uz": {
   "prompt": "x = 3 da ifodani qiymati bilan moslang.",
   "explanation": "3² = 9, 2 × 3 + 1 = 7, 12 ÷ 3 = 4.",
   "options": {
    "l2": "12 ÷ x"
   }
  }
 },
 "How many minutes are in two and a half hours? Type a number.": {
  "ru": {
   "prompt": "Сколько минут в двух с половиной часах? Введите число.",
   "explanation": "2,5 × 60 = 150.",
   "hint": "В часе 60 минут."
  },
  "uz": {
   "prompt": "Ikki yarim soatda necha daqiqa bor? Sonni yozing.",
   "explanation": "2,5 × 60 = 150.",
   "hint": "Bir soatda 60 daqiqa."
  }
 },
 "Two coins are tossed. What is the probability of two heads, as a fraction?": {
  "ru": {
   "prompt": "Бросают две монеты. Какова вероятность двух орлов? Запишите дробью.",
   "explanation": "Четыре равновозможных исхода, один из них два орла.",
   "hint": "Выпишите все исходы."
  },
  "uz": {
   "prompt": "Ikki tanga tashlandi. Ikkalasi gerb tushish ehtimoli? Kasr bilan yozing.",
   "explanation": "To‘rtta teng imkoniyat, bittasi ikki gerb.",
   "hint": "Barcha holatlarni yozing."
  }
 },
 "Which value of x makes x² − 5x + 6 equal to zero?": {
  "ru": {
   "prompt": "При каком x выражение x² − 5x + 6 равно нулю?",
   "explanation": "x² − 5x + 6 = (x − 2)(x − 3).",
   "hint": "Разложите на множители."
  },
  "uz": {
   "prompt": "x ning qaysi qiymatida x² − 5x + 6 nolga teng?",
   "explanation": "x² − 5x + 6 = (x − 2)(x − 3).",
   "hint": "Ko‘paytuvchilarga ajrating."
  }
 },
 "Which ancient civilization built the pyramids at Giza?": {
  "ru": {
   "prompt": "Какая цивилизация построила пирамиды в Гизе?",
   "explanation": "Пирамиды построили древние египтяне.",
   "options": {
    "a": "Римляне",
    "b": "Египтяне",
    "c": "Греки",
    "d": "Персы"
   }
  },
  "uz": {
   "prompt": "Giza piramidalarini qaysi sivilizatsiya qurgan?",
   "explanation": "Piramidalarni qadimgi misrliklar qurgan.",
   "options": {
    "a": "Rimliklar",
    "b": "Misrliklar",
    "c": "Yunonlar",
    "d": "Forslar"
   }
  }
 },
 "In which year did World War II end?": {
  "ru": {
   "prompt": "В каком году закончилась Вторая мировая война?",
   "explanation": "Вторая мировая закончилась в 1945 году."
  },
  "uz": {
   "prompt": "Ikkinchi jahon urushi qaysi yili tugagan?",
   "explanation": "Ikkinchi jahon urushi 1945-yilda tugagan."
  }
 },
 "Who was the first emperor of China?": {
  "ru": {
   "prompt": "Кто был первым императором Китая?",
   "explanation": "Цинь Шихуанди объединил Китай в 221 году до н. э.",
   "options": {
    "a": "Конфуций",
    "b": "Цинь Шихуанди",
    "c": "Сунь Ятсен",
    "d": "Хань У-ди"
   }
  },
  "uz": {
   "prompt": "Xitoyning birinchi imperatori kim?",
   "explanation": "Sin Shixuandi Xitoyni mil. avv. 221-yilda birlashtirgan.",
   "options": {
    "a": "Konfutsiy",
    "b": "Sin Shixuandi",
    "c": "Sun Yatsen",
    "d": "Xan U-di"
   }
  }
 },
 "The Renaissance began in which region?": {
  "ru": {
   "prompt": "Где началось Возрождение?",
   "explanation": "Возрождение началось в итальянских городах.",
   "options": {
    "a": "Италия",
    "b": "Россия",
    "c": "Япония",
    "d": "Скандинавия"
   }
  },
  "uz": {
   "prompt": "Uyg‘onish davri qayerda boshlangan?",
   "explanation": "Uyg‘onish davri Italiya shaharlarida boshlangan.",
   "options": {
    "a": "Italiya",
    "b": "Rossiya",
    "c": "Yaponiya",
    "d": "Skandinaviya"
   }
  }
 },
 "What was the main cause of the French Revolution?": {
  "ru": {
   "prompt": "Что было главной причиной Французской революции?",
   "explanation": "К революции привели неравенство и финансовый кризис.",
   "options": {
    "a": "Социальное и экономическое неравенство",
    "b": "Вторжение врага",
    "c": "Извержение вулкана",
    "d": "Открытие Америки"
   }
  },
  "uz": {
   "prompt": "Fransuz inqilobining asosiy sababi nima?",
   "explanation": "Inqilobga tengsizlik va moliyaviy inqiroz olib kelgan.",
   "options": {
    "a": "Ijtimoiy va iqtisodiy tengsizlik",
    "b": "Chet el bosqini",
    "c": "Vulqon otilishi",
    "d": "Amerikaning kashf etilishi"
   }
  }
 },
 "Which empire was ruled by Julius Caesar?": {
  "ru": {
   "prompt": "Какой державой правил Юлий Цезарь?",
   "explanation": "Юлий Цезарь был римским полководцем и диктатором.",
   "options": {
    "a": "Римской",
    "b": "Османской",
    "c": "Монгольской",
    "d": "Британской"
   }
  },
  "uz": {
   "prompt": "Yuliy Sezar qaysi davlatni boshqargan?",
   "explanation": "Yuliy Sezar Rim sarkardasi va diktatori edi.",
   "options": {
    "a": "Rim",
    "b": "Usmonli",
    "c": "Mo‘g‘ul",
    "d": "Britaniya"
   }
  }
 },
 "Name the ancient city destroyed by Mount Vesuvius in 79 CE. Type one word.": {
  "ru": {
   "prompt": "Назовите древний город, уничтоженный Везувием в 79 году. Одно слово.",
   "explanation": "Помпеи были засыпаны вулканическим пеплом."
  },
  "uz": {
   "prompt": "79-yilda Vezuviy vayron qilgan qadimgi shahar nomi? Bir so‘z.",
   "explanation": "Pompeyni vulqon kuli qoplagan."
  }
 },
 "Match the civilization to its writing system.": {
  "ru": {
   "prompt": "Соедините цивилизацию с письменностью.",
   "explanation": "В Египте иероглифы, в Месопотамии клинопись.",
   "options": {
    "egypt": "Египет",
    "mesopotamia": "Месопотамия",
    "hieroglyphs": "Иероглифы",
    "cuneiform": "Клинопись"
   }
  },
  "uz": {
   "prompt": "Sivilizatsiyani yozuvi bilan moslang.",
   "explanation": "Misrda iyeroglif, Mesopotamiyada mixxat.",
   "options": {
    "egypt": "Misr",
    "mesopotamia": "Mesopotamiya",
    "hieroglyphs": "Iyerogliflar",
    "cuneiform": "Mixxat"
   }
  }
 },
 "Which treaty ended World War I?": {
  "ru": {
   "prompt": "Какой договор завершил Первую мировую войну?",
   "explanation": "Версальский договор подписан в 1919 году.",
   "options": {
    "a": "Версальский",
    "b": "Парижский",
    "c": "Берлинский",
    "d": "Венский"
   }
  },
  "uz": {
   "prompt": "Birinchi jahon urushini qaysi shartnoma yakunlagan?",
   "explanation": "Versal shartnomasi 1919-yilda imzolangan.",
   "options": {
    "a": "Versal",
    "b": "Parij",
    "c": "Berlin",
    "d": "Vena"
   }
  }
 },
 "Order these events chronologically.": {
  "ru": {
   "prompt": "Расположите события по времени.",
   "explanation": "Первая мировая (1914–18), Вторая мировая (1939–45), затем холодная война.",
   "options": {
    "ww1": "Первая мировая война",
    "ww2": "Вторая мировая война",
    "cold": "Холодная война"
   }
  },
  "uz": {
   "prompt": "Voqealarni vaqt bo‘yicha tartiblang.",
   "explanation": "Birinchi (1914–18), Ikkinchi (1939–45), keyin sovuq urush.",
   "options": {
    "ww1": "Birinchi jahon urushi",
    "ww2": "Ikkinchi jahon urushi",
    "cold": "Sovuq urush"
   }
  }
 },
 "Set the year World War I began.": {
  "ru": {
   "prompt": "Наберите год начала Первой мировой войны.",
   "explanation": "Первая мировая началась в 1914 году.",
   "hint": "Она закончилась в 1918."
  },
  "uz": {
   "prompt": "Birinchi jahon urushi boshlangan yilni tering.",
   "explanation": "Birinchi jahon urushi 1914-yilda boshlangan.",
   "hint": "U 1918-yilda tugagan."
  }
 },
 "Switch on every civilisation that grew along a river.": {
  "ru": {
   "prompt": "Включите цивилизации, выросшие у реки.",
   "explanation": "Нил, Тигр и Евфрат, Инд; остальные две были островными.",
   "options": {
    "a": "Египет",
    "b": "Месопотамия",
    "c": "Долина Инда",
    "d": "Минойский Крит",
    "e": "Остров Пасхи"
   }
  },
  "uz": {
   "prompt": "Daryo bo‘yida yuksalgan sivilizatsiyalarni yoqing.",
   "explanation": "Nil, Dajla va Furot, Hind; qolgan ikkitasi orol madaniyati.",
   "options": {
    "a": "Misr",
    "b": "Mesopotamiya",
    "c": "Hind vodiysi",
    "d": "Minoy Kriti",
    "e": "Pasxa oroli"
   }
  }
 },
 "The Silk Road was a single paved road.": {
  "ru": {
   "prompt": "Шёлковый путь был одной мощёной дорогой.",
   "explanation": "Это была сеть торговых путей через Азию."
  },
  "uz": {
   "prompt": "Ipak yo‘li bitta tosh yo‘l edi.",
   "explanation": "U Osiyo bo‘ylab savdo yo‘llari tarmog‘i edi."
  }
 },
 "Order the inventions, earliest first.": {
  "ru": {
   "prompt": "Расположите изобретения от раннего к позднему.",
   "explanation": "От древности до девятнадцатого века.",
   "options": {
    "a": "Колесо",
    "b": "Бумага",
    "c": "Печатный станок",
    "d": "Паровой двигатель",
    "e": "Телефон"
   }
  },
  "uz": {
   "prompt": "Ixtirolarni eng qadimgisidan tartiblang.",
   "explanation": "Qadimdan o‘n to‘qqizinchi asrgacha.",
   "options": {
    "a": "G‘ildirak",
    "b": "Qog‘oz",
    "c": "Bosma dastgoh",
    "d": "Bug‘ mashinasi",
    "e": "Telefon"
   }
  }
 },
 "Pair each structure with its country.": {
  "ru": {
   "prompt": "Соедините сооружение со страной.",
   "explanation": "Рим, север Китая и Самарканд.",
   "options": {
    "l0": "Колизей",
    "l1": "Великая стена",
    "l2": "Регистан",
    "r0": "Италия",
    "r1": "Китай",
    "r2": "Узбекистан"
   }
  },
  "uz": {
   "prompt": "Inshootni mamlakati bilan moslang.",
   "explanation": "Rim, Shimoliy Xitoy va Samarqand.",
   "options": {
    "l0": "Kolizey",
    "l1": "Buyuk devor",
    "l2": "Registon",
    "r0": "Italiya",
    "r1": "Xitoy",
    "r2": "O‘zbekiston"
   }
  }
 },
 "Which organelle produces most of a cell’s ATP?": {
  "ru": {
   "prompt": "Какой органоид производит больше всего АТФ?",
   "explanation": "Митохондрии: энергостанции клетки.",
   "options": {
    "a": "Ядро",
    "b": "Митохондрия",
    "c": "Рибосома",
    "d": "Аппарат Гольджи"
   }
  },
  "uz": {
   "prompt": "Hujayrada ATF ni eng ko‘p qaysi organoid hosil qiladi?",
   "explanation": "Mitoxondriyalar hujayraning energiya stansiyasi.",
   "options": {
    "a": "Yadro",
    "b": "Mitoxondriya",
    "c": "Ribosoma",
    "d": "Golji apparati"
   }
  }
 },
 "What molecule carries genetic information?": {
  "ru": {
   "prompt": "Какая молекула несёт генетическую информацию?",
   "explanation": "ДНК хранит наследственные инструкции.",
   "options": {
    "a": "Только РНК",
    "b": "ДНК",
    "c": "Белок",
    "d": "Глюкоза"
   }
  },
  "uz": {
   "prompt": "Irsiy axborotni qaysi molekula tashiydi?",
   "explanation": "DNK irsiy ko‘rsatmalarni saqlaydi.",
   "options": {
    "a": "Faqat RNK",
    "b": "DNK",
    "c": "Oqsil",
    "d": "Glyukoza"
   }
  }
 },
 "What process converts light energy into chemical energy?": {
  "ru": {
   "prompt": "Какой процесс превращает энергию света в химическую?",
   "explanation": "Фотосинтез превращает свет в глюкозу.",
   "options": {
    "a": "Дыхание",
    "b": "Фотосинтез",
    "c": "Пищеварение",
    "d": "Брожение"
   }
  },
  "uz": {
   "prompt": "Yorug‘lik energiyasini kimyoviyga qaysi jarayon aylantiradi?",
   "explanation": "Fotosintez yorug‘likni glyukozaga aylantiradi.",
   "options": {
    "a": "Nafas olish",
    "b": "Fotosintez",
    "c": "Hazm",
    "d": "Bijg‘ish"
   }
  }
 },
 "Which blood cells fight infection?": {
  "ru": {
   "prompt": "Какие клетки крови борются с инфекцией?",
   "explanation": "Лейкоциты (белые клетки крови) защищают организм.",
   "options": {
    "a": "Эритроциты",
    "b": "Тромбоциты",
    "c": "Лейкоциты",
    "d": "Плазматические клетки"
   }
  },
  "uz": {
   "prompt": "Qaysi qon hujayralari infeksiyaga qarshi kurashadi?",
   "explanation": "Leykotsitlar (oq qon hujayralari) tanani himoya qiladi.",
   "options": {
    "a": "Eritrotsitlar",
    "b": "Trombotsitlar",
    "c": "Leykotsitlar",
    "d": "Plazma hujayralari"
   }
  }
 },
 "What is the function of ribosomes?": {
  "ru": {
   "prompt": "Какова функция рибосом?",
   "explanation": "Рибосомы собирают белок по мРНК.",
   "options": {
    "a": "Хранение ДНК",
    "b": "Синтез белка",
    "c": "Выработка энергии",
    "d": "Удаление отходов"
   }
  },
  "uz": {
   "prompt": "Ribosomalarning vazifasi nima?",
   "explanation": "Ribosomalar mRNK bo‘yicha oqsil yig‘adi.",
   "options": {
    "a": "DNK saqlash",
    "b": "Oqsil sintezi",
    "c": "Energiya hosil qilish",
    "d": "Chiqindini yo‘qotish"
   }
  }
 },
 "In Mendelian genetics, a dominant allele is expressed when…": {
  "ru": {
   "prompt": "По Менделю доминантный аллель проявляется, когда…",
   "explanation": "Для проявления достаточно одного доминантного аллеля.",
   "options": {
    "a": "Он в паре с рецессивным",
    "b": "Есть два рецессивных аллеля",
    "c": "Он только в Y-хромосоме",
    "d": "Организм женского пола"
   }
  },
  "uz": {
   "prompt": "Mendel bo‘yicha dominant allel qachon namoyon bo‘ladi?",
   "explanation": "Belgi chiqishi uchun bitta dominant allel yetarli.",
   "options": {
    "a": "Retsessiv bilan juft bo‘lsa",
    "b": "Ikki retsessiv allel bo‘lsa",
    "c": "Faqat Y xromosomada bo‘lsa",
    "d": "Organizm urg‘ochi bo‘lsa"
   }
  }
 },
 "Name the gas plants absorb during photosynthesis. Type one word.": {
  "ru": {
   "prompt": "Какой газ растения поглощают при фотосинтезе?",
   "explanation": "Растения поглощают углекислый газ и выделяют кислород."
  },
  "uz": {
   "prompt": "Fotosintezda o‘simlik qaysi gazni yutadi?",
   "explanation": "O‘simlik karbonat angidridni yutib, kislorod chiqaradi."
  }
 },
 "Match the organ to its system.": {
  "ru": {
   "prompt": "Соедините орган с системой.",
   "explanation": "Сердце качает кровь, лёгкие обменивают газы.",
   "options": {
    "heart": "Сердце",
    "lung": "Лёгкое",
    "circulatory": "Кровообращение",
    "respiratory": "Дыхание"
   }
  },
  "uz": {
   "prompt": "Organni tizimi bilan moslang.",
   "explanation": "Yurak qon haydaydi, o‘pka gaz almashtiradi.",
   "options": {
    "heart": "Yurak",
    "lung": "O‘pka",
    "circulatory": "Qon aylanish",
    "respiratory": "Nafas olish"
   }
  }
 },
 "Which process releases energy from glucose?": {
  "ru": {
   "prompt": "Какой процесс высвобождает энергию из глюкозы?",
   "explanation": "При дыхании из глюкозы получается АТФ.",
   "options": {
    "a": "Фотосинтез",
    "b": "Клеточное дыхание",
    "c": "Транскрипция",
    "d": "Осмос"
   }
  },
  "uz": {
   "prompt": "Glyukozadan energiyani qaysi jarayon ajratadi?",
   "explanation": "Nafas olishda glyukozadan ATF hosil bo‘ladi.",
   "options": {
    "a": "Fotosintez",
    "b": "Hujayra nafasi",
    "c": "Transkripsiya",
    "d": "Osmos"
   }
  }
 },
 "What is a trophic level?": {
  "ru": {
   "prompt": "Что такое трофический уровень?",
   "explanation": "Трофический уровень: место в питании.",
   "options": {
    "a": "Тип клетки",
    "b": "Место в пищевой цепи",
    "c": "Среда обитания вида",
    "d": "Стадия митоза"
   }
  },
  "uz": {
   "prompt": "Trofik daraja nima?",
   "explanation": "Trofik daraja oziqlanishdagi o‘rinni bildiradi.",
   "options": {
    "a": "Hujayra turi",
    "b": "Oziq zanjiridagi o‘rin",
    "c": "Tur yashash joyi",
    "d": "Mitoz bosqichi"
   }
  }
 },
 "One DNA strand reads A T G C. Set the matching strand.": {
  "ru": {
   "prompt": "Одна цепь ДНК: A T G C. Наберите парную.",
   "explanation": "A парна T, G парна C.",
   "hint": "A с T. G с C."
  },
  "uz": {
   "prompt": "DNK zanjiri: A T G C. Juftini tering.",
   "explanation": "A ning jufti T, G ning jufti C.",
   "hint": "A bilan T. G bilan C."
  }
 },
 "One DNA strand reads G G A T C. Set the matching strand.": {
  "ru": {
   "prompt": "Одна цепь ДНК: G G A T C. Наберите парную.",
   "explanation": "У каждого основания одна пара: G–C и A–T.",
   "hint": "По одному основанию."
  },
  "uz": {
   "prompt": "DNK zanjiri: G G A T C. Juftini tering.",
   "explanation": "Har asosning bitta jufti bor: G–C va A–T.",
   "hint": "Bittadan bajaring."
  }
 },
 "Set the number of chromosomes in a human body cell.": {
  "ru": {
   "prompt": "Наберите число хромосом в клетке тела человека.",
   "explanation": "В клетке 23 пары: 46 хромосом.",
   "hint": "Их 23 пары."
  },
  "uz": {
   "prompt": "Odam tana hujayrasidagi xromosomalar sonini tering.",
   "explanation": "Hujayrada 23 juft: 46 xromosoma.",
   "hint": "Ular 23 juft."
  }
 },
 "Switch on everything found in a plant cell but not in an animal cell.": {
  "ru": {
   "prompt": "Включите всё, что есть в растительной клетке, но не в животной.",
   "explanation": "Ядро и митохондрии есть в обеих.",
   "hint": "Что нужно растению, чтобы стоять и создавать пищу?",
   "options": {
    "a": "Клеточная стенка",
    "b": "Ядро",
    "c": "Хлоропласт",
    "d": "Митохондрия",
    "e": "Крупная вакуоль"
   }
  },
  "uz": {
   "prompt": "O‘simlik hujayrasida bor, hayvonnikida yo‘q narsalarni yoqing.",
   "explanation": "Yadro va mitoxondriya ikkalasida ham bor.",
   "hint": "O‘simlikka tik turish va oziq hosil qilish uchun nima kerak?",
   "options": {
    "a": "Hujayra devori",
    "b": "Yadro",
    "c": "Xloroplast",
    "d": "Mitoxondriya",
    "e": "Katta vakuol"
   }
  }
 },
 "Switch on every organ of the digestive system.": {
  "ru": {
   "prompt": "Включите все органы пищеварения.",
   "explanation": "Лёгкие относятся к дыханию, сердце к кровообращению.",
   "options": {
    "a": "Желудок",
    "b": "Лёгкие",
    "c": "Печень",
    "d": "Сердце",
    "e": "Тонкий кишечник"
   }
  },
  "uz": {
   "prompt": "Hazm tizimi organlarini yoqing.",
   "explanation": "O‘pka nafasga, yurak qon aylanishga kiradi.",
   "options": {
    "a": "Oshqozon",
    "b": "O‘pka",
    "c": "Jigar",
    "d": "Yurak",
    "e": "Ingichka ichak"
   }
  }
 },
 "Switch on every abiotic factor.": {
  "ru": {
   "prompt": "Включите все абиотические факторы.",
   "explanation": "Абиотические факторы: неживая часть экосистемы.",
   "hint": "Абиотический значит неживой.",
   "options": {
    "a": "Температура",
    "b": "Грибы",
    "c": "Свет",
    "d": "Хищники",
    "e": "Кислотность почвы"
   }
  },
  "uz": {
   "prompt": "Barcha abiotik omillarni yoqing.",
   "explanation": "Abiotik omillar ekotizimning jonsiz qismi.",
   "hint": "Abiotik: jonsiz.",
   "options": {
    "a": "Harorat",
    "b": "Zamburug‘lar",
    "c": "Yorug‘lik",
    "d": "Yirtqichlar",
    "e": "Tuproq kislotaligi"
   }
  }
 },
 "Arteries carry blood away from the heart.": {
  "ru": {
   "prompt": "Артерии несут кровь от сердца.",
   "explanation": "Артерии от сердца, вены обратно.",
   "hint": "Куда течёт кровь из сердца?"
  },
  "uz": {
   "prompt": "Arteriyalar qonni yurakdan olib ketadi.",
   "explanation": "Arteriya yurakdan, vena yurakka.",
   "hint": "Yurakdan qon qayerga oqadi?"
  }
 },
 "Bacteria have a nucleus.": {
  "ru": {
   "prompt": "У бактерий есть ядро.",
   "explanation": "Бактерии: прокариоты, их ДНК свободна в клетке."
  },
  "uz": {
   "prompt": "Bakteriyalarda yadro bor.",
   "explanation": "Bakteriyalar prokariot, DNK si hujayrada erkin."
  }
 },
 "Energy increases at each step of a food chain.": {
  "ru": {
   "prompt": "Энергия растёт с каждым звеном пищевой цепи.",
   "explanation": "Большая часть энергии теряется как тепло.",
   "hint": "Куда уходит энергия, которую животное тратит на движение?"
  },
  "uz": {
   "prompt": "Oziq zanjirining har bosqichida energiya ortadi.",
   "explanation": "Energiyaning ko‘pi issiqlik bo‘lib yo‘qoladi.",
   "hint": "Hayvon harakatga sarflagan energiya qayerga ketadi?"
  }
 },
 "Order the levels of organisation, smallest first.": {
  "ru": {
   "prompt": "Расположите уровни организации от меньшего к большему.",
   "explanation": "Клетки образуют ткани, ткани образуют органы.",
   "hint": "Начните с самой малой живой единицы.",
   "options": {
    "a": "Клетка",
    "b": "Ткань",
    "c": "Орган",
    "d": "Система органов",
    "e": "Организм"
   }
  },
  "uz": {
   "prompt": "Tuzilish darajalarini kichigidan tartiblang.",
   "explanation": "Hujayralar to‘qimani, to‘qimalar organni hosil qiladi.",
   "hint": "Eng kichik tirik birlikdan boshlang.",
   "options": {
    "a": "Hujayra",
    "b": "To‘qima",
    "c": "Organ",
    "d": "Organlar tizimi",
    "e": "Organizm"
   }
  }
 },
 "Order the path of food through the body.": {
  "ru": {
   "prompt": "Расположите путь пищи в организме.",
   "explanation": "Пища идёт ото рта к толстому кишечнику.",
   "options": {
    "a": "Рот",
    "b": "Пищевод",
    "c": "Желудок",
    "d": "Тонкий кишечник",
    "e": "Толстый кишечник"
   }
  },
  "uz": {
   "prompt": "Ovqatning tanadagi yo‘lini tartiblang.",
   "explanation": "Ovqat og‘izdan yo‘g‘on ichakkacha boradi.",
   "options": {
    "a": "Og‘iz",
    "b": "Qizilo‘ngach",
    "c": "Oshqozon",
    "d": "Ingichka ichak",
    "e": "Yo‘g‘on ichak"
   }
  }
 },
 "Order the stages of mitosis.": {
  "ru": {
   "prompt": "Расположите стадии митоза.",
   "explanation": "Профаза, метафаза, анафаза, телофаза.",
   "hint": "П-М-А-Т.",
   "options": {
    "a": "Профаза",
    "b": "Метафаза",
    "c": "Анафаза",
    "d": "Телофаза"
   }
  },
  "uz": {
   "prompt": "Mitoz bosqichlarini tartiblang.",
   "explanation": "Profaza, metafaza, anafaza, telofaza.",
   "hint": "P-M-A-T.",
   "options": {
    "a": "Profaza",
    "b": "Metafaza",
    "c": "Anafaza",
    "d": "Telofaza"
   }
  }
 },
 "Put the food chain in order, starting with the producer.": {
  "ru": {
   "prompt": "Расположите пищевую цепь, начиная с производителя.",
   "explanation": "Сначала производители, в конце высшие хищники.",
   "options": {
    "a": "Трава",
    "b": "Кузнечик",
    "c": "Лягушка",
    "d": "Змея",
    "e": "Ястреб"
   }
  },
  "uz": {
   "prompt": "Oziq zanjirini ishlab chiqaruvchidan tartiblang.",
   "explanation": "Avval ishlab chiqaruvchilar, oxirida yirtqichlar.",
   "options": {
    "a": "O‘t",
    "b": "Chigirtka",
    "c": "Qurbaqa",
    "d": "Ilon",
    "e": "Qirg‘iy"
   }
  }
 },
 "Pair each part of the cell with its job.": {
  "ru": {
   "prompt": "Соедините часть клетки и её работу.",
   "explanation": "У каждого органоида своя роль.",
   "options": {
    "l0": "Ядро",
    "l1": "Митохондрия",
    "l2": "Мембрана",
    "r0": "Хранит ДНК",
    "r1": "Даёт энергию",
    "r2": "Решает, что войдёт"
   }
  },
  "uz": {
   "prompt": "Hujayra qismini vazifasi bilan moslang.",
   "explanation": "Har bir organoidning o‘z vazifasi bor.",
   "options": {
    "l0": "Yadro",
    "l1": "Mitoxondriya",
    "l2": "Membrana",
    "r0": "DNK saqlaydi",
    "r1": "Energiya beradi",
    "r2": "Nima kirishini boshqaradi"
   }
  }
 },
 "Pair each sense with its organ.": {
  "ru": {
   "prompt": "Соедините чувство с органом.",
   "explanation": "У каждого чувства свой орган.",
   "options": {
    "l0": "Зрение",
    "l1": "Слух",
    "l2": "Обоняние",
    "l3": "Осязание",
    "r0": "Глаз",
    "r1": "Ухо",
    "r2": "Нос",
    "r3": "Кожа"
   }
  },
  "uz": {
   "prompt": "Sezgini organi bilan moslang.",
   "explanation": "Har sezgining o‘z organi bor.",
   "options": {
    "l0": "Ko‘rish",
    "l1": "Eshitish",
    "l2": "Hid",
    "l3": "Teri sezgisi",
    "r0": "Ko‘z",
    "r1": "Quloq",
    "r2": "Burun",
    "r3": "Teri"
   }
  }
 },
 "Pair each term with its meaning.": {
  "ru": {
   "prompt": "Соедините термин со значением.",
   "explanation": "Генотип: что внутри, фенотип: что видно.",
   "hint": "Фено- значит «являю».",
   "options": {
    "l0": "Аллель",
    "l1": "Фенотип",
    "l2": "Генотип",
    "r0": "Вариант гена",
    "r1": "Видимый признак",
    "r2": "Сочетание генов"
   }
  },
  "uz": {
   "prompt": "Atamani ma’nosi bilan moslang.",
   "explanation": "Genotip ichki, fenotip ko‘rinadigan.",
   "hint": "Feno- «namoyon» degani.",
   "options": {
    "l0": "Allel",
    "l1": "Fenotip",
    "l2": "Genotip",
    "r0": "Gen varianti",
    "r1": "Ko‘rinadigan belgi",
    "r2": "Genlar birikmasi"
   }
  }
 },
 "Type the name of the green pigment in plants.": {
  "ru": {
   "prompt": "Назовите зелёный пигмент растений.",
   "explanation": "Хлорофилл поглощает свет для фотосинтеза.",
   "hint": "Начинается на «хлоро»."
  },
  "uz": {
   "prompt": "O‘simliklarning yashil pigmenti nomi?",
   "explanation": "Xlorofill fotosintez uchun yorug‘lik yutadi.",
   "hint": "«Xloro» bilan boshlanadi."
  }
 },
 "How many chambers does the human heart have? Type a number.": {
  "ru": {
   "prompt": "Сколько камер в сердце человека? Введите число.",
   "explanation": "Два предсердия и два желудочка."
  },
  "uz": {
   "prompt": "Odam yuragida necha kamera bor? Sonni yozing.",
   "explanation": "Ikki bo‘lmacha va ikki qorincha."
  }
 },
 "Two parents are both Bb. What fraction of their children are expected to be bb?": {
  "ru": {
   "prompt": "Оба родителя Bb. Какая доля детей ожидается bb?",
   "explanation": "Bb × Bb даёт BB, Bb, Bb и bb.",
   "hint": "Нарисуйте решётку Пеннета.",
   "options": {
    "a": "Никто",
    "b": "Четверть",
    "c": "Половина",
    "d": "Три четверти"
   }
  },
  "uz": {
   "prompt": "Ikkala ota-ona Bb. Farzandlarning qanchasi bb bo‘lishi kutiladi?",
   "explanation": "Bb × Bb dan BB, Bb, Bb va bb chiqadi.",
   "hint": "Pennet jadvalini chizing.",
   "options": {
    "a": "Hech qancha",
    "b": "Chorak",
    "c": "Yarim",
    "d": "To‘rtdan uch"
   }
  }
 }
};

/** Extra accepted answers for typed questions. */
export const EXTRA_ANSWERS: Record<string, string[]> = {
 "Name the ancient city destroyed by Mount Vesuvius in 79 CE. Type one word.": [
  "помпеи",
  "помпея",
  "pompey",
  "pompeya"
 ],
 "Name the gas plants absorb during photosynthesis. Type one word.": [
  "углекислый газ",
  "диоксид углерода",
  "karbonat angidrid",
  "uglerod dioksid",
  "karbonat angidrid gazi"
 ],
 "Type the name of the green pigment in plants.": [
  "хлорофилл",
  "xlorofill",
  "xlorofil"
 ]
};

export const MATERIAL_TEXT: Record<string, Record<string, object>> = {
 "Keeping an equation balanced": {
  "ru": {
   "title": "Уравнение как весы",
   "body": "Уравнение похоже на весы: что делаете с одной стороной, делайте и с другой. Отменяйте действия в обратном порядке: сначала прибавленное или вычтенное, потом умножение или деление. Подставьте ответ и проверьте.",
   "examples": [
    "4x − 5 = 19 → прибавить 5 → 4x = 24 → разделить на 4 → x = 6.",
    "x + y = 12 и x − y = 2: сложите, получится 2x = 14, значит x = 7, y = 5."
   ]
  },
  "uz": {
   "title": "Tenglama tarozi kabi",
   "body": "Tenglama taroziga o‘xshaydi: bir tomonda nima qilsangiz, ikkinchisida ham qiling. Amallarni teskari tartibda bekor qiling: avval qo‘shish yoki ayirish, keyin ko‘paytirish yoki bo‘lish. Javobni qo‘yib tekshiring.",
   "examples": [
    "4x − 5 = 19 → 5 ni qo‘shing → 4x = 24 → 4 ga bo‘ling → x = 6.",
    "x + y = 12 va x − y = 2: qo‘shsangiz 2x = 14, demak x = 7, y = 5."
   ]
  }
 },
 "Angles and right triangles": {
  "ru": {
   "title": "Углы и прямоугольные треугольники",
   "body": "Сумма углов треугольника 180°. Фигура с n сторонами имеет (n − 2) × 180°. В прямоугольном треугольнике a² + b² = c².",
   "examples": [
    "Пятиугольник: (5 − 2) × 180° = 540°.",
    "Стороны 6 и 8: 36 + 64 = 100, длинная сторона 10."
   ]
  },
  "uz": {
   "title": "Burchaklar va to‘g‘ri uchburchak",
   "body": "Uchburchak burchaklari yig‘indisi 180°. n tomonli shaklda (n − 2) × 180°. To‘g‘ri burchakli uchburchakda a² + b² = c².",
   "examples": [
    "Beshburchak: (5 − 2) × 180° = 540°.",
    "Tomonlar 6 va 8: 36 + 64 = 100, uzun tomon 10."
   ]
  }
 },
 "Primes, fractions and percentages": {
  "ru": {
   "title": "Простые числа, дроби и проценты",
   "body": "У простого числа ровно два делителя: 1 и оно само. Дробь не меняется, если умножить числитель и знаменатель на одно число. Чтобы найти процент, разделите на 100 и умножьте.",
   "examples": [
    "13 простое, а 21 = 3 × 7 нет.",
    "20% от 350 = 0,20 × 350 = 70."
   ]
  },
  "uz": {
   "title": "Tub sonlar, kasrlar va foizlar",
   "body": "Tub sonning aynan ikki bo‘luvchisi bor: 1 va o‘zi. Surat va maxraj bir songa ko‘paytirilsa, kasr o‘zgarmaydi. Foizni topish uchun 100 ga bo‘lib ko‘paytiring.",
   "examples": [
    "13 tub, 21 = 3 × 7 tub emas.",
    "350 ning 20% i = 0,20 × 350 = 70."
   ]
  }
 },
 "Mean, median, range": {
  "ru": {
   "title": "Среднее, медиана, размах",
   "body": "Среднее: сумма, делённая на количество. Медиана: число посередине упорядоченного ряда, а если средних два, то их среднее. Размах: наибольшее минус наименьшее. Вероятность: благоприятные исходы, делённые на все равновозможные.",
   "examples": [
    "2, 5, 11: среднее 6, медиана 5, размах 9.",
    "Чётное число на кубике: 3 из 6, то есть 1/2."
   ]
  },
  "uz": {
   "title": "O‘rtacha, mediana, kenglik",
   "body": "O‘rtacha: yig‘indi soniga bo‘linadi. Mediana: tartiblangan qator o‘rtasi, ikkita bo‘lsa, ularning o‘rtachasi. Kenglik: eng kattasi minus eng kichigi. Ehtimol: qulay holatlar barcha teng holatlarga bo‘linadi.",
   "examples": [
    "2, 5, 11: o‘rtacha 6, mediana 5, kenglik 9.",
    "Kubikda juft son: 6 dan 3, ya’ni 1/2."
   ]
  }
 },
 "Tenses that tell the order of events": {
  "ru": {
   "title": "Времена и порядок событий",
   "body": "Past simple: законченное действие (she opened the door). Past perfect (had + третья форма): то, что было раньше другого прошлого (the bell had rung before we came). С he, she, it в настоящем добавляется -s, в вопросах does.",
   "examples": [
    "When I arrived, the lesson had started.",
    "Does he know the answer? No, he doesn’t."
   ]
  },
  "uz": {
   "title": "Zamonlar va voqealar tartibi",
   "body": "Past simple: tugagan ish (she opened the door). Past perfect (had + uchinchi shakl): boshqa o‘tgan ishdan oldin bo‘lgani (the bell had rung before we came). He, she, it bilan hozirgi zamonda -s, savolda does.",
   "examples": [
    "When I arrived, the lesson had started.",
    "Does he know the answer? No, he doesn’t."
   ]
  }
 },
 "Synonyms, antonyms and idioms": {
  "ru": {
   "title": "Синонимы, антонимы и идиомы",
   "body": "Синонимы близки по смыслу, но разной силы: warm, hot, boiling. Антонимы противоположны. Смысл идиомы не складывается из слов, её учат целиком.",
   "examples": [
    "\"Hit the books\" значит усердно учиться.",
    "scarce = в недостатке, abundant = в изобилии."
   ]
  },
  "uz": {
   "title": "Sinonim, antonim va idiomalar",
   "body": "Sinonimlar ma’nosi yaqin, kuchi har xil: warm, hot, boiling. Antonimlar qarama-qarshi. Idioma ma’nosi so‘zlar yig‘indisi emas, butunicha yodlanadi.",
   "examples": [
    "\"Hit the books\": qattiq o‘qish.",
    "scarce = kam, abundant = mo‘l."
   ]
  }
 },
 "Finding what the text does not say": {
  "ru": {
   "title": "Что текст не говорит прямо",
   "body": "Главная мысль: что автор утверждает о теме. Вывод делают по намёкам. Сравнение (simile) использует like или as, метафора называет одно другим, олицетворение даёт вещам человеческие действия.",
   "examples": [
    "\"The wind whispered\": олицетворение.",
    "\"He grabbed his umbrella\": возможно, пойдёт дождь."
   ]
  },
  "uz": {
   "title": "Matnda ochiq aytilmagani",
   "body": "Asosiy fikr: muallif mavzu haqida nima deydi. Xulosa ishoralardan chiqariladi. Simile like yoki as bilan, metafora bir narsani boshqasi deb ataydi, jonlantirish narsaga inson harakatini beradi.",
   "examples": [
    "\"The wind whispered\": jonlantirish.",
    "\"He grabbed his umbrella\": yomg‘ir yog‘ishi mumkin."
   ]
  }
 },
 "Building a clear paragraph": {
  "ru": {
   "title": "Ясный абзац",
   "body": "Начните с главного предложения, добавьте две-три детали и вернитесь к мысли в конце. Меняйте длину предложений и читайте вслух.",
   "examples": [
    "Topic: Libraries still matter. Support: quiet, free, guided."
   ]
  },
  "uz": {
   "title": "Aniq paragraf",
   "body": "Asosiy gapdan boshlang, ikki-uch tafsilot qo‘shing va oxirida fikrga qayting. Gaplar uzunligini o‘zgartiring, ovoz chiqarib o‘qing.",
   "examples": [
    "Topic: Libraries still matter. Support: quiet, free, guided."
   ]
  }
 },
 "What every cell needs": {
  "ru": {
   "title": "Что есть в каждой клетке",
   "body": "Мембрана решает, что войдёт. Ядро хранит ДНК. Митохондрии дают энергию, рибосомы собирают белки. У растений ещё стенка, хлоропласты и крупная вакуоль. У бактерий нет ядра. Митоз: профаза, метафаза, анафаза, телофаза.",
   "examples": [
    "В мышечной клетке много митохондрий: ей нужно много энергии.",
    "Стадии митоза: П-М-А-Т."
   ]
  },
  "uz": {
   "title": "Har bir hujayrada nima bor",
   "body": "Membrana nima kirishini boshqaradi. Yadro DNK saqlaydi. Mitoxondriya energiya beradi, ribosoma oqsil yig‘adi. O‘simlikda yana devor, xloroplast va katta vakuol bor. Bakteriyada yadro yo‘q. Mitoz: profaza, metafaza, anafaza, telofaza.",
   "examples": [
    "Mushak hujayrasida mitoxondriya ko‘p: unga ko‘p energiya kerak.",
    "Mitoz bosqichlari: P-M-A-T."
   ]
  }
 },
 "Reading the code": {
  "ru": {
   "title": "Читаем код",
   "body": "ДНК состоит из двух цепей. A всегда парна T, а G парна C. Варианты гена называются аллелями. Доминантный виден и при одной копии, рецессивный только при двух. Генотип: сочетание, фенотип: что видно.",
   "examples": [
    "Цепи T A C G парна A T G C.",
    "Bb × Bb даёт 1 BB : 2 Bb : 1 bb."
   ]
  },
  "uz": {
   "title": "Kodni o‘qish",
   "body": "DNK ikki zanjirdan iborat. A doim T bilan, G esa C bilan juft. Gen variantlari allel deyiladi. Dominant bitta nusxada ham, retsessiv faqat ikki nusxada ko‘rinadi. Genotip: birikma, fenotip: ko‘rinadigani.",
   "examples": [
    "T A C G ning jufti A T G C.",
    "Bb × Bb dan 1 BB : 2 Bb : 1 bb."
   ]
  }
 },
 "Energy through an ecosystem": {
  "ru": {
   "title": "Энергия в экосистеме",
   "body": "Производители улавливают свет. Потребители едят производителей или друг друга. На следующий уровень переходит около десятой части энергии, остальное теряется как тепло. Биотические факторы живые, абиотические нет.",
   "examples": [
    "Трава → кролик → лиса.",
    "Свет, температура и кислотность почвы абиотические."
   ]
  },
  "uz": {
   "title": "Ekotizimda energiya",
   "body": "Ishlab chiqaruvchilar yorug‘likni tutadi. Iste’molchilar ularni yoki bir-birini yeydi. Keyingi darajaga energiyaning o‘ndan biri o‘tadi, qolgani issiqlik bo‘lib ketadi. Biotik omillar jonli, abiotik jonsiz.",
   "examples": [
    "O‘t → quyon → tulki.",
    "Yorug‘lik, harorat va tuproq kislotaligi abiotik."
   ]
  }
 },
 "Systems working together": {
  "ru": {
   "title": "Системы работают вместе",
   "body": "В сердце четыре камеры. Артерии несут кровь от сердца, вены к нему. Лёгкие обменивают газы. Пища идёт через пищевод и желудок в тонкий кишечник, где всасывается большая часть веществ. Лейкоциты борются с инфекцией.",
   "examples": [
    "Кислород входит в кровь в лёгких и выходит в мышцах."
   ]
  },
  "uz": {
   "title": "Tizimlar birga ishlaydi",
   "body": "Yurak to‘rt kamerali. Arteriya qonni yurakdan, vena yurakka olib boradi. O‘pka gaz almashtiradi. Ovqat qizilo‘ngach va oshqozondan ingichka ichakka o‘tadi, moddalarning ko‘pi shu yerda so‘riladi. Leykotsitlar infeksiyaga qarshi kurashadi.",
   "examples": [
    "Kislorod qonga o‘pkada kirib, mushaklarda chiqadi."
   ]
  }
 },
 "Forces and Newton’s laws": {
  "ru": {
   "title": "Силы и законы Ньютона",
   "body": "Равнодействующая сила меняет движение: F = m × a. Без неё тело покоится или движется с постоянной скоростью. На каждое действие есть равное противодействие.",
   "examples": [
    "Тележка 2 кг с ускорением 3 м/с² требует 6 Н."
   ]
  },
  "uz": {
   "title": "Kuchlar va Nyuton qonunlari",
   "body": "Teng ta’sir etuvchi kuch harakatni o‘zgartiradi: F = m × a. Usiz jism tinch turadi yoki bir xil tezlikda yuradi. Har ta’sirga teng aks ta’sir bor.",
   "examples": [
    "2 kg aravacha 3 m/s² tezlanishda 6 N talab qiladi."
   ]
  }
 },
 "Current, voltage, resistance": {
  "ru": {
   "title": "Ток, напряжение, сопротивление",
   "body": "Напряжение толкает заряд, сопротивление мешает, ток: поток заряда. I = V ÷ R. Проводники пропускают заряд, изоляторы нет.",
   "examples": [
    "9 В на 3 Ом дают 3 А."
   ]
  },
  "uz": {
   "title": "Tok, kuchlanish, qarshilik",
   "body": "Kuchlanish zaryadni itaradi, qarshilik to‘sqinlik qiladi, tok bu oqim: I = V ÷ R. O‘tkazgich zaryadni o‘tkazadi, izolyator yo‘q.",
   "examples": [
    "9 V va 3 Ω da tok 3 A."
   ]
  }
 },
 "Rivers and first cities": {
  "ru": {
   "title": "Реки и первые города",
   "body": "Первые города выросли там, где реки делали урожай надёжным: Нил, Тигр и Евфрат, Инд, Хуанхэ. Излишки пищи дали ремёсла, письменность и законы.",
   "examples": [
    "Клинопись вдавливали в глину в Месопотамии."
   ]
  },
  "uz": {
   "title": "Daryolar va ilk shaharlar",
   "body": "Ilk shaharlar daryo hosilni ishonchli qilgan joyda o‘sgan: Nil, Dajla va Furot, Hind, Xuanxe. Ortiqcha oziq hunar, yozuv va qonunlarga yo‘l ochdi.",
   "examples": [
    "Mixxat Mesopotamiyada loyga bosib yozilgan."
   ]
  }
 }
};

export const CAMPAIGN_TEXT: Record<string, Record<string, object>> = {
 "The Last Lesson": {
  "ru": {
   "title": "Последний урок",
   "description": "Полная история кабинета 9-Б. Математика, английский и биология за одну ночь.",
   "objectives": [
    "Найти выход из школы № 47",
    "Узнать, почему не прозвенел звонок"
   ]
  },
  "uz": {
   "title": "Oxirgi dars",
   "description": "9-B xonasining to‘liq hikoyasi. Bir tunda matematika, ingliz tili va biologiya.",
   "objectives": [
    "47-maktabdan chiqish yo‘lini topish",
    "Qo‘ng‘iroq nega chalinmaganini bilish"
   ]
  }
 },
 "Short Period: Science": {
  "ru": {
   "title": "Короткий урок: науки",
   "description": "Короткий визит на один урок. Биология и физика, вопросы проще.",
   "objectives": [
    "Вернуть свет",
    "Выйти до звонка"
   ]
  },
  "uz": {
   "title": "Qisqa dars: fanlar",
   "description": "Bir darslik qisqa sayohat. Biologiya va fizika, savollar osonroq.",
   "objectives": [
    "Chiroqni yoqish",
    "Qo‘ng‘iroqqacha chiqish"
   ]
  }
 }
};
