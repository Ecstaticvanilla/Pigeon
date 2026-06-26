import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = mongoose.Schema({
        username:{
            type:String,
            required:[true, "Username is required"],
        },
        email:{
            type:String,
            required:[true, "Email is required"],
            unique:true,
        },
        password:{
            type:String,
            required:[true, "Password is required"],
            select:false
        },
        storageUsedBytes: {
        type: Number,
        default: 0,
        },
    },
    {timestamps : true},
)

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User",userSchema);

export default User;