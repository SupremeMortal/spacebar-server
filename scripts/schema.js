/*
	Spacebar: A FOSS re-implementation and extension of the Discord.com backend.
	Copyright (C) 2023 Spacebar and Spacebar Contributors

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published
	by the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/*
	Regenerates the `spacebarchat/server/assets/schemas.json` file, used for API/Gateway input validation.
*/

const path = require("path");
const fs = require("fs");
const TJS = require("typescript-json-schema");
const walk = require("./util/walk");
const schemaPath = path.join(__dirname, "..", "assets", "schemas.json");

const settings = {
	required: true,
	ignoreErrors: true,
	excludePrivate: true,
	defaultNumberType: "integer",
	noExtraProps: true,
	defaultProps: false,
};

const Excluded = [
	"DefaultSchema",
	"Schema",
	"EntitySchema",
	"ServerResponse",
	"Http2ServerResponse",
	"ExpressResponse",
	"global.Express.Response",
	"global.Response",
	"Response",
	"e.Response",
	"request.Response",
	"supertest.Response",
	"DiagnosticsChannel.Response",
	"_Response",
	"ReadableStream<any>",

	// TODO: Figure out how to exclude schemas from node_modules?
	"SomeJSONSchema",
	"UncheckedPartialSchema",
	"PartialSchema",
	"UncheckedPropertiesSchema",
	"PropertiesSchema",
	"AsyncSchema",
	"AnySchema",
	"SMTPConnection.CustomAuthenticationResponse",
	"TransportMakeRequestResponse",
];

function main() {
	const program = TJS.programFromConfig(
		path.join(__dirname, "..", "tsconfig.json"),
		walk(path.join(__dirname, "..", "src", "util", "schemas")),
	);
	const generator = TJS.buildGenerator(program, settings);
	if (!generator || !program) return;

	let schemas = generator.getUserSymbols().filter((x) => {
		return (
			(x.endsWith("Schema") ||
				x.endsWith("Response") ||
				x.startsWith("API")) &&
			!Excluded.includes(x)
		);
	});

	var definitions = {};

	for (const name of schemas) {
		const part = TJS.generateSchema(program, name, settings, [], generator);
		if (!part) continue;

		// this is a hack. want some want to check if its a @column, instead
		if (part.properties) {
			for (let key in part.properties) {
				if (
					[
						// BaseClass methods
						"toJSON",
						"hasId",
						"save",
						"remove",
						"softRemove",
						"recover",
						"reload",
						"assign",
					].includes(key)
				) {
					delete part.properties[key];
					continue;
				}
			}
		}

		definitions = { ...definitions, [name]: { ...part } };
	}

	fs.writeFileSync(schemaPath, JSON.stringify(definitions, null, 4));
}

main();
