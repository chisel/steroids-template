## sub(validationDefinition)

**Type:** Function  
**Arguments:**
  - validationDefinition  
    **Type:** [ValidationDefinition](../router-decorator/routedefinition/validationrule/validationdefinition)  
    **Required:** Yes  
    **Description:** A validation definition object.

**Type check:** No  
**Casts:** No  
**Returns:** [ValidatorFunction](../router-decorator/routedefinition/validationrule/validatorfunction)  
**Description:** Validates the target (which should be an object) against the given validation definition. This is more practical and useful when provided as the `validator` parameter of the [type.Array(validator, arrayValidator)](#typearrayvalidator-arrayvalidator) validator factory.

```ts
import { Router, body, type, sub } from '@steroids/core';

@Router({
  name: 'example',
  routes: [
    { path: '/', validate: [
      body({
        children: type.Array(sub({
          firstName: type.String,
          lastName: type.String
        }))
      })
    ]}
  ]
})
export class ExampleRouter { }
```
