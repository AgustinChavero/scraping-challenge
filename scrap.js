require("dotenv").config();
const puppeteer = require("puppeteer");
const xlsx = require("xlsx");

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${process.env.DENTALINK_URL}/sessions/login`);
  console.log("Página de inicio de sesión cargada");

  await page.waitForSelector('input[name="user"]');
  await page.waitForSelector('input[name="password"]');
  await page.type('input[name="user"]', process.env.USER_NAME);
  await page.type('input[name="password"]', process.env.USER_PASSWORD);
  await page.click('button[type="button"]');
  console.log("Formulario de inicio de sesión completado");

  await page.waitForNavigation();
  console.log("Inicio de sesión completado");

  await page.goto(`${process.env.DENTALINK_URL}/clientes`);
  await page.waitForSelector("body");
  console.log("Página de clientes cargada");

  await new Promise((resolve) => setTimeout(resolve, 5000));

  const patientIds = await page.evaluate(() => {
    const ids = Array.from({ length: 915 }, (_, i) => i + 1);
    /* const idElements = document.querySelectorAll(".td.id");
    idElements.forEach((idElement) => {
      const id = idElement.innerText.trim();
      ids.push(id);
    }); */
    return ids;
  });

  console.log(`IDs de pacientes encontrados: ${patientIds.join(", ")}`);

  const workbook = xlsx.utils.book_new();

  const worksheetData1 = [
    [
      "ID Paciente",
      "Nombre",
      "Nombre Social",
      "Apellidos",
      "Cédula",
      "Email",
      "Ciudad",
      "Comuna",
      "Dirección",
      "Teléfono",
      "Actividad",
      "Empleador",
      "Observaciones",
      "Apoderado",
      "Referencia",
      "DNI Representante Legal",
      "Fecha de Nacimiento",
    ],
  ];
  const worksheet1 = xlsx.utils.aoa_to_sheet(worksheetData1);
  xlsx.utils.book_append_sheet(workbook, worksheet1, "DatosPersonales");

  const worksheetData2 = [
    [
      "ID Paciente",
      "Fecha Escrita",
      "Nombre Doctor/Paciente",
      "Plan de Tratamiento ID",
      "Contenido del Plan de Tratamiento",
    ],
  ];
  const worksheet2 = xlsx.utils.aoa_to_sheet(worksheetData2);
  xlsx.utils.book_append_sheet(workbook, worksheet2, "Evoluciones");

  for (let id of patientIds) {
    await page.goto(
      `https://fmsclinic.dentalink.cl/pacientes/${id}/gestion/personales`
    ); // Navega al paciente
    await page.waitForSelector("body"); // Espera un momento

    // Funciones para obtener valores de input y span
    async function getInputValue(selector) {
      await page.waitForSelector(selector);
      return page.evaluate((selector) => {
        const input = document.querySelector(selector);
        return input ? input.value : null;
      }, selector);
    }

    async function getSpanValue(selector) {
      await page.waitForSelector(selector);
      return page.evaluate((selector) => {
        const span = document.querySelector(selector);
        return span ? span.innerText.trim() : null;
      }, selector);
    }

    const dia = await getInputValue('input[placeholder="día"]');
    const mes = await getInputValue('input[placeholder="mes"]');
    const año = await getInputValue('input[placeholder="año"]');
    const fechaNacimiento = `${dia}-${mes}-${año}`; // Extraer los valores de los campos de fecha de nacimiento

    // Obtener los valores de los inputs y span
    const nombreValue = await getInputValue('input[id="nombre"]');
    const nombreSocialValue = await getInputValue('input[id="nombre_social"]');
    const apellidosValue = await getInputValue('input[id="apellidos"]');
    const cedulaValue = await getSpanValue('span[data-for="popover-dni"]');
    const mailValue = await getInputValue('input[id="mail"]');
    const ciudadValue = await getInputValue('input[id="ciudad"]');
    const comunaValue = await getInputValue('input[id="comuna"]');
    const direccionValue = await getInputValue('input[id="direccion"]');
    const telefonoValue = await getInputValue('input[id="telefono"]');
    const actividadValue = await getInputValue('input[id="actividad"]');
    const empleadorValue = await getInputValue('input[id="empleador"]');
    const observacionesValue = await getInputValue('input[id="observaciones"]');
    const apoderadoValue = await getInputValue('input[id="apoderado"]');
    const referenciaValue = await getInputValue(
      'input[aria-controls="react-autowhatever-1"]'
    );
    const dniRepresentanteValue = await getInputValue('input[id="1"]');

    const personalData = [
      id,
      nombreValue,
      nombreSocialValue,
      apellidosValue,
      cedulaValue,
      mailValue,
      ciudadValue,
      comunaValue,
      direccionValue,
      telefonoValue,
      actividadValue,
      empleadorValue,
      observacionesValue,
      apoderadoValue,
      referenciaValue,
      dniRepresentanteValue,
      fechaNacimiento,
    ];

    console.log(`Datos personales de paciente ${id}:`, personalData);

    xlsx.utils.sheet_add_aoa(worksheet1, [personalData], { origin: -1 });

    await page.goto(
      `https://fmsclinic.dentalink.cl/pacientes/${id}/ficha/evoluciones`
    ); // Ir a evoluciones
    await page.waitForSelector("body");

    const evoluciones = await page.evaluate(() => {
      const data = [];
      const elementos = Array.from(document.querySelectorAll("div"));
      elementos.forEach((el) => {
        const fechaEl = el.querySelector("i.fa-calendar");
        const doctorEl = el.querySelector("i.fa-user");
        const planTratamientoEl = el.querySelector(
          'span[style="font-weight: 600;"]'
        );

        if (fechaEl && doctorEl && planTratamientoEl) {
          const fechaEscrita =
            fechaEl.parentElement.innerText
              .split("Escrita el ")[1]
              ?.split("\n")[0]
              ?.trim() || "";
          const nombreDoctor =
            doctorEl.parentElement.innerText.split("\n")[0]?.trim() || "";
          const planTratamientoID =
            planTratamientoEl.innerText.split(":")[0]?.trim() || "";
          const planTratamientoContenido =
            planTratamientoEl.nextElementSibling?.innerText
              .split("\n")[0]
              ?.trim() || "";

          data.push({
            fechaEscrita,
            nombreDoctor,
            planTratamientoID,
            planTratamientoContenido,
          });
        }
      });
      return data;
    });

    console.log(`Evoluciones de paciente ${id}:`, evoluciones);

    // Filtrar duplicidad basadas en la fecha escrita
    const filteredEvoluciones = evoluciones.reduce((acc, e, index) => {
      if (
        index === 0 ||
        e.fechaEscrita !== evoluciones[index - 1].fechaEscrita
      ) {
        acc.push([
          id,
          e.fechaEscrita,
          e.nombreDoctor,
          e.planTratamientoID,
          e.planTratamientoContenido,
        ]);
      }
      return acc;
    }, []);

    xlsx.utils.sheet_add_aoa(worksheet2, filteredEvoluciones, { origin: -1 });
  }

  const filePath = "datos_pacientes.xlsx";
  try {
    xlsx.writeFile(workbook, filePath);
    console.log(`Archivo Excel guardado en ${filePath}`);
  } catch (err) {
    console.error(`Error al guardar el archivo Excel: ${err.message}`);
  }

  await browser.close();
})();
