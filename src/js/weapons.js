
/* global element */
/* global AttributeCell */
/* global uniqueLabel */

/* global CategoryModel */
/* global MultiActiveCategory */

/* global Weapon */
/* global Attribute */
/* global AttackFeature */

/* global Grade */

/* global Expression */


class Weapons {

	static DEFAULT = "Unarmed";

	static DESCRIPTION = "Write any additional information here.";

	constructor(sheet) {
		this.root  = document.createElement("div");
		this.sheet = sheet;

		this._name = element("input", {
			class : ["simple-border"],
			attrs : {
				type     : "text", 
				value    : Weapons.DEFAULT,
				onchange : (() => {
					const activeID = this.sheet.wb.category.getActive();
					if (activeID === null) return;

					const element = this.sheet.wb.category.elements.get(activeID);
					element.title = this.name;
				}),
			},
		});

		this._select = element("select", {
			class: ["simple-border"],
			attrs: {
				value   : Weapons.DEFAULT,
				oninput : (() => {this.template = this._select.value;}),
			},
		});

		this._template = Weapon.get(Weapons.DEFAULT);

		for (let template of definitions.weapons) {
			const option       = element("option");
			option.value       = template.name;
			option.textContent = template.name;
			this._select.appendChild(option);
		}

		const model = new CategoryModel(
			Attribute.kind,
			Attribute.byName,
			((feature) => feature.title()),
			((feature) => feature.body()),
			((feature) => feature.dependancies)
		);

		this.attributes = new MultiActiveCategory(model, {
			name        : "themes",
			empty       : "Weapon has no attributes",
			selectable  : true,
			reorderable : true,
			removable   : true,
			addActive   : true,
			ontoggle    : ((category, key) => {
				category.toggleActive(key);
				this.refresh();
			}),
			onremove    : ((category, key) => {
				const wasActive = category.isActive(key);
				category.delete(key);

				if (wasActive) this.refresh();
			}),
		});

		this._description = element("textarea", {
			class   : ["simple-border"],
			content : Weapons.DESCRIPTION,
		});

		this._dt = document.createTextNode(this._template.title());
		this._dd = document.createTextNode(this._template.body());

		this.stats = {};

		const lconf = {edit: true, root: "span", value: 0, shown: "0",  min: -100, max: +100, after : ","};
		const cconf = {edit: true, root: "span", value: 0, shown: "0",  min: -100, max: +100};

		const makefn = (name) => {
			const baseFunction = new Expression.Env(
				Expression.Env.RUNTIME, this.sheet.definez
			).func(`weapon|total|${name}`);

			return ((base) => {
				this.sheet.stats.refreshSecondary();
				return baseFunction();
			});
		};

		const defsec = (key, config, fn) => {
			const cell      = new AttributeCell(config, fn);
			this.stats[key] = cell;
			return cell;
		};

		const wide   = (title, key, trig) => {
			return element("tr", [
				element("th", title),
				element("td", {
					class   : ["center"],
					attrs   : {colSpan: 2},
					content : defsec(key, cconf, trig).root,
				}),
			]);
		};

		const dual = (title, key1, key2) => {
			return element("tr", [
				element("th", title),
				element("td", {
					class   : ["center", "padded-cell-left"],
					content : defsec(key1, lconf, makefn(key1)).root,
				}),
				element("td", {
					class   : ["center", "padded-cell-right"],
					content : defsec(key2, cconf, makefn(key2)).root
				}),
			]);
		};

		this._rank  = new AttributeCell({
			edit    : true,
			value   : 0,
			shown   : "E",
			min     : -11,
			max     : 11,
			root    : "span",
			trigger : ((base) => {

				let sum = base + Grade.toNumber(this.template.rank);

				for (let attribute of this.attributes.getActive()) {
					sum += Attribute.get(attribute).rank;
				}

				return Grade.fromNumber(Math.max(Math.min(sum, 12), 0));
			}),
		});

		this._price = new AttributeCell({
			edit    : true,
			after   : " GP",
			value   : 0,
			shown   : "0",
			min     : 0,
			max     : 100000,
			step    : 1,
			root    : "span",
			trigger : ((base) => {
				let sum = base + (this.template.price || 0);

				for (let attribute of this.attributes.getActive()) {
					sum += Attribute.get(attribute).price;
				}

				return sum;
			}),
		});

		this._base = new AttributeCell({
			edit    : true,
			value   : 0,
			shown   : "ELSE",
			min     : AttackFeature.BASE.min,
			max     : AttackFeature.BASE.max,
			step    : 1,
			root    : "span",
			trigger : ((base) => {
				const value = baseFunction();
				const text  = AttackFeature.BASE.asString(value);
				this.sheet.stats.refreshSecondary();
				return text.toUpperCase();
			}),
		});

		const baseFunction = new Expression.Env(
			Expression.Env.RUNTIME, this.sheet.definez
		).func("weapon|total|base");

		const second = element("tbody", [
			wide("Might", "mt", makefn("mt")),
			// wide("Based on", "base", ,
			element("tr", [
				element("th", "Based on"),
				element("td", {
					class   : ["center"],
					attrs   : {colSpan: 2},
					content : this._base.root,
				}),
			]),
			dual("Prot/Resl", "prot", "resl"),
			dual("Hit/Avo", "hit", "avo"),
			dual("Crit/Avo", "crit", "cravo"),
			dual("SP/TP", "sp", "tp"),
			dual("Costs", "spcost", "tpcost"),
			element("tr", [
				element("th", "Range"),
				element("td", {
					attrs   : {colSpan: 2},
					class   : ["center", "padded-cell"],
					content : [
						defsec("minrng", cconf, makefn("minrng")).root,
						element("span", " - ", "datum"),
						defsec("maxrng", cconf, makefn("maxrng")).root,
					],
				}),
			]),
			element("tr", [
				element("th", "Rank"),
				element("td", {
					class   : ["center"],
					attrs   : {colSpan: 2}, 
					content : this._rank.root
				}),
			]),
			element("tr", [
				element("th", "Price"),
				element("td", {
					class   : ["center"],
					attrs   : {colSpan: 2},
					content : this._price.root,
				}),
			]),
		]);

		this.root = element("div", [
			uniqueLabel("Spell or Weapon Name", this._name), element("br"),
			this._name, element("br"),

			uniqueLabel("Template", this._select), element("br"),
			this._select, element("br"), element("br"),

			element("dt", this._dt), element("dd", this._dd),

			element("br"),

			element("details", [
				element("summary", element("label", "Attributes")),
				this.attributes.root,
			]),

			element("details", [
				element("summary", element("label", "Information")),
				this._description,
			]),

			element("details", [
				element("summary", element("label", "Other Statistics")),
				element("table", second, "battalion-table"),
			]),
		], "center-pane");
	}

	fullInfo() {
		return (
			this._template.description + (
				this.information != Weapons.DESCRIPTION
					? " " + this.information
					: ""
			)
		);
	}

	get name() {
		return this._name.value;
	}

	set name(value) {
		this._name.value = value;

		const activeID = this.sheet.wb.category.getActive();
		if (activeID === null) return;

		const element = this.sheet.wb.category.elements.get(activeID);
		element.title = this.name;
	}

	get description() {
		return this._template.name;
	}

	get information() {
		return this._description.value;
	}

	set information(value) {
		this._description.value = value;
	}

	get base() {
		return this._base.value;
	}

	set base(value) {
		this._base.value = value;
	}

	get template() {
		return this._template;
	}

	set template(value) {

		this._template     = Weapon.get(value);
		this._select.value = value;

		this._dt.data = this._template.title();
		this._dd.data = this._template.body();

		this.refresh();

		const activeID = this.sheet.wb.category.getActive();
		if (activeID === null) return;

		const elemenn       = this.sheet.wb.category.elements.get(activeID);
		elemenn.description = this.description;
	}

	get price() {
		return this._price.value;
	}

	set price(value) {
		this._price.value = value;
	}

	get rank() {
		return this._rank.value;
	}

	set rank(value) {
		this._rank.value = value;
	}

	refresh() {
		this._rank.refresh();
		this._price.refresh();
		for (let stat in this.stats) {
			this.stats[stat].refresh();
		}
	}

	import(weapon) {

		this.name        = weapon.name     || Weapons.DEFAULT;
		this.rank        = weapon.rank     || 0;
		this.base        = weapon.base     || 0;
		this.price       = weapon.price    || 0;
		this.template    = weapon.template || Weapons.DEFAULT;
		this.attributes.setState(weapon.attributes);
		this.information = weapon.description || Weapons.DESCRIPTION;

		for (let stat in weapon.statistics) {
			if (!(stat in this.stats)) continue; // todo remove after refactor
			this.stats[stat].value = weapon.statistics[stat];
		}

		this.refresh();
	}

	export() {

		const stats = {};

		for (let stat in this.stats) {
			stats[stat] = this.stats[stat].value;
		}

		return {
			name        : this.name,
			rank        : this.rank,
			base        : this.base,
			price       : this.price,
			template    : this.template.name,
			attributes  : this.attributes.getState(),
			statistics  : stats,
			description : this.information,
		};
	}

	clear(preset) {

		this.attributes.clear();
		this.name        = preset || Weapons.DEFAULT;
		this.template    = preset || Weapons.DEFAULT;
		this.information = Weapons.DESCRIPTION;
		this.rank        = 0;
		this.price       = 0;

		for (let stat in this.stats) {
			this.stats[stat].value = 0;
		}
	}

}

/* exported Weapons */